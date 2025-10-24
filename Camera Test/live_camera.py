import cv2
from flask import Flask, Response
import threading

app = Flask(__name__)

# Configuration
HOST = '0.0.0.0'
PORT = 5000

# Global variable untuk menyimpan frame
camera = None
camera_lock = threading.Lock()

class CameraStream:
    def __init__(self):
        self.camera = cv2.VideoCapture(0)
        self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.camera.set(cv2.CAP_PROP_FPS, 30)
        
    def __del__(self):
        if self.camera.isOpened():
            self.camera.release()
    
    def get_frame(self):
        with camera_lock:
            success, frame = self.camera.read()
            if not success:
                return None
            return frame

def generate_frames():
    """Generator untuk streaming video"""
    global camera
    
    while True:
        frame = camera.get_frame()
        if frame is None:
            break
            
        # Encode frame ke JPEG
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not ret:
            continue
            
        frame_bytes = buffer.tobytes()
        
        # Yield frame dalam format multipart
        yield (b'--frame\r\n'
              b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/video_feed')
def video_feed():
    """Route untuk streaming video"""
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/health')
def health():
    """Health check endpoint"""
    return {'status': 'ok', 'camera': 'active'}

def start_camera_server(host=HOST, port=PORT):
    """Memulai server kamera"""
    global camera
    camera = CameraStream()
    
    print(f"Camera server starting...")
    print(f"Live camera URL: http://{host}:{port}/video_feed")
    print(f"Press Ctrl+C to stop")
    
    app.run(host=host, port=port, threaded=True, debug=False)

if __name__ == '__main__':
    try:
        start_camera_server()
    except KeyboardInterrupt:
        print("\nShutting down camera server...")
        if camera:
            del camera
        cv2.destroyAllWindows()