import cv2
import torch
import numpy as np
import torch.nn as nn
from flask import Flask, Response
import requests
import psutil
import time
from ultralytics import YOLO
from yolo_classifier import YOLOPoseVideoClassifier

app = Flask(__name__)

# Configuration
HOST = '0.0.0.0'
PORT = 5001
MODEL_PATH = './_model/yolo_pose_violence_classifier.pth'
YOLO_MODEL_PATH = './_model/yolo11n-pose.pt'
CAMERA_URL = 'http://localhost:5000/video_feed'

CLASS_NAMES = ["non_violence", "physical_violence", "sexual_violence"]

# ------------------------------
# Violence Detector
# ------------------------------
class ViolenceDetector:
    def __init__(self, model_path, camera_url, conf_threshold=0.5):
        self.model_path = model_path
        self.camera_url = camera_url
        self.conf_threshold = conf_threshold
        
        print("Loading YOLO11n-pose model...")
        self.pose_model = YOLO(YOLO_MODEL_PATH)
        
        print(f"Loading violence classifier from {model_path}...")
        checkpoint = torch.load(model_path, map_location='cpu')
        
        # Buat model dan load bobot
        self.classifier = YOLOPoseVideoClassifier(num_classes=len(CLASS_NAMES))
        self.classifier.load_state_dict(checkpoint['model_state_dict'])
        self.classifier.eval()
        
        self.class_names = CLASS_NAMES
        self.colors = {
            "physical_violence": (0, 0, 255),
            "sexual_violence": (0, 165, 255)
        }
        
        self.fps = 0
        self.frame_count = 0
        self.start_time = time.time()
    
    def extract_pose_features(self, keypoints):
        """
        Extract keypoints (17x3) jadi format (1, num_frames=1, 17, 3)
        karena model di-train dengan sequence video, 
        tapi inference kita hanya 1 frame.
        """
        features = torch.tensor(keypoints, dtype=torch.float32).unsqueeze(0).unsqueeze(0)
        return features  # shape: (1, 1, 17, 3)
    
    def classify_pose(self, keypoints):
        """Klasifikasi pose"""
        try:
            features = self.extract_pose_features(keypoints)
            with torch.no_grad():
                outputs = self.classifier(features)
                probabilities = torch.softmax(outputs, dim=1)
                confidence, predicted = torch.max(probabilities, 1)
            
            class_name = self.class_names[predicted.item()]
            conf = confidence.item()
            return class_name, conf
        except Exception as e:
            print(f"Classification error: {e}")
            return "non_violence", 0.0
    
    def draw_skeleton(self, frame, keypoints, color):
        skeleton = [
            [16, 14], [14, 12], [17, 15], [15, 13],
            [12, 13], [6, 12], [7, 13], [6, 7],
            [6, 8], [8, 10], [7, 9], [9, 11],
            [12, 14], [14, 16], [13, 15], [15, 17]
        ]
        
        for i, (x, y, conf) in enumerate(keypoints):
            if conf > 0.5:
                cv2.circle(frame, (int(x), int(y)), 4, color, -1)
        
        for c in skeleton:
            pt1_idx, pt2_idx = c[0] - 1, c[1] - 1
            if pt1_idx < len(keypoints) and pt2_idx < len(keypoints):
                pt1 = keypoints[pt1_idx]
                pt2 = keypoints[pt2_idx]
                if pt1[2] > 0.5 and pt2[2] > 0.5:
                    cv2.line(frame, (int(pt1[0]), int(pt1[1])), 
                            (int(pt2[0]), int(pt2[1])), color, 2)
    
    def draw_bbox(self, frame, bbox, label, confidence, color):
        x1, y1, x2, y2 = map(int, bbox)
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        label_text = f"{label}: {confidence:.2f}"
        (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        cv2.rectangle(frame, (x1, y1 - th - 10), (x1 + tw + 10, y1), color, -1)
        cv2.putText(frame, label_text, (x1 + 5, y1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    
    def draw_system_info(self, frame):
        """Draw system information (RAM, CPU, FPS for this process only)"""
        process = psutil.Process()
        ram_used_mb = process.memory_info().rss / (1024 ** 2)
        cpu_used = process.cpu_percent(interval=0)  # % CPU by this process

        # FPS
        self.frame_count += 1
        elapsed = time.time() - self.start_time
        if elapsed > 1.0:
            self.fps = self.frame_count / elapsed
            self.frame_count = 0
            self.start_time = time.time()
        
        info = [
            f"FPS: {self.fps:.1f}",
            f"CPU (proc): {cpu_used:.1f}%",
            f"RAM (proc): {ram_used_mb:.0f} MB"
        ]
        
        y_offset = frame.shape[0] - 100
        cv2.rectangle(frame, (10, y_offset), (260, frame.shape[0] - 10), (0, 0, 0), -1)
        cv2.rectangle(frame, (10, y_offset), (260, frame.shape[0] - 10), (255, 255, 255), 2)
        for i, t in enumerate(info):
            cv2.putText(frame, t, (20, y_offset + 25 + i * 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    def process_frame(self, frame):
        if frame is None:
            return None
        results = self.pose_model(frame, verbose=False)
        for result in results:
            if result.keypoints is not None and len(result.keypoints) > 0:
                boxes = result.boxes
                keypoints = result.keypoints
                for box, kpts in zip(boxes, keypoints):
                    bbox = box.xyxy[0].cpu().numpy()
                    kpts_data = kpts.data[0].cpu().numpy()
                    class_name, confidence = self.classify_pose(kpts_data)
                    if confidence > self.conf_threshold:
                        color = self.colors.get(class_name, (0, 255, 0))
                        self.draw_bbox(frame, bbox, class_name, confidence, color)
                        self.draw_skeleton(frame, kpts_data, color)
        self.draw_system_info(frame)
        return frame
    
    def get_camera_stream(self):
        try:
            response = requests.get(self.camera_url, stream=True, timeout=5)
            if response.status_code == 200:
                bytes_data = bytes()
                for chunk in response.iter_content(chunk_size=1024):
                    bytes_data += chunk
                    a = bytes_data.find(b'\xff\xd8')
                    b = bytes_data.find(b'\xff\xd9')
                    if a != -1 and b != -1:
                        jpg = bytes_data[a:b+2]
                        bytes_data = bytes_data[b+2:]
                        img = cv2.imdecode(np.frombuffer(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
                        yield img
        except Exception as e:
            print(f"Error getting camera stream: {e}")
            time.sleep(1)
            yield None


# ------------------------------
# Flask Server
# ------------------------------
detector = None

def generate_processed_frames(detector):
    for frame in detector.get_camera_stream():
        if frame is None:
            continue
        processed_frame = detector.process_frame(frame)
        if processed_frame is not None:
            ret, buffer = cv2.imencode('.jpg', processed_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if not ret:
                continue
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/processed_feed')
def processed_feed():
    return Response(generate_processed_frames(detector),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/health')
def health():
    return {'status': 'ok', 'detector': 'active'}

def start_detector_server(model_path, camera_url, host=HOST, port=PORT):
    global detector
    print("Initializing Violence Detector...")
    detector = ViolenceDetector(model_path, camera_url)
    print(f"\nServer running at: http://{host}:{port}/processed_feed")
    app.run(host=host, port=port, threaded=True, debug=False)

if __name__ == '__main__':
    try:
        start_detector_server(MODEL_PATH, CAMERA_URL)
    except KeyboardInterrupt:
        print("\nShutting down...")
        cv2.destroyAllWindows()
