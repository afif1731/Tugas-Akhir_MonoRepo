import os
import cv2
import time
import json
import struct
import socket
import logging
import threading
import numpy as np
from collections import deque
import tflite_runtime.interpreter as tflite

from lib.lib_ai.detector import yolo_pose_extraction, gcn_classification
from lib.lib_ai.crowd_cluster import CentroidTracker, spatial_clustering

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [AI-SERVER] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger(__name__)

YOLO_IMGZ = 640
YOLO_PERSON_CONFIDENCE_THRESHOLD = 0.15
YOLO_IOU_THRESHOLD = 0.45

CENTROID_TRACKER_MAX_DISAPPEARED = 200
CENTROID_TRACKER_MAX_DISTANCE = 300

SPATIAL_CLUSTERING_MAX_DISTANCE = 200

def load_interpreter(model_path, model_name):
    logger.info(f"Loading {model_name}...")

    try:
        delegate_lib = os.getenv('EDGETPU_SHARED_LIB', 'libedgetpu.so.1')

        delegate = tflite.load_delegate(delegate_lib)
        interpreter = tflite.Interpreter(model_path=model_path, experimental_delegates=[delegate], num_threads=4)
        interpreter.allocate_tensors()
        
        interpreter._delegate_ref = delegate 
        logger.info(f"Successfully loaded {model_name} with tflite_runtime delegate (Edge TPU).")
        return interpreter
    except Exception as e:
        logger.warning(f"Edge TPU delegate load failed for {model_name}: {e}. Falling back to CPU...")

    interpreter = tflite.Interpreter(model_path=model_path, num_threads=4)
    interpreter.allocate_tensors()
    logger.info(f"Successfully loaded {model_name} on CPU.")
    return interpreter

def recv_exact(conn, n):
    data = bytearray()
    while len(data) < n:
        packet = conn.recv(n - len(data))
        if not packet:
            return None
        data.extend(packet)
    return data

def handle_client(conn, addr):
    logger.info(f"New client connected from {addr}")
    cap = None
    try:
        # 1. Terima Panjang Konfigurasi (4 byte)
        raw_msglen = recv_exact(conn, 4)
        if not raw_msglen:
            return
        msglen = struct.unpack('>I', raw_msglen)[0]
        
        # 2. Terima Data Konfigurasi JSON
        config_data = recv_exact(conn, msglen)
        if not config_data:
            return
        
        req = json.loads(config_data.decode('utf-8'))
        
        camera_id = req['camera_id']
        input_source = req['input_source']
        source_type = req['source_type']
        config = req['config']
        
        logger.info(f"[{camera_id}] Configuring camera source: {input_source}")
        
        classes = config['CLASSES']
        t_frames = config['T']
        v_joints = config['V']
        m_people = config['M']
        
        yolo_file = config.get('YOLO_FILE', 'yolov8n-pose_full_integer_quant_edgetpu.tflite')
        gcn_file = config.get('GCN_FILE', 'GCN_LSTM_best_int8_edgetpu.tflite')

        base_dir = os.path.dirname(os.path.abspath(__file__))
        yolo_path = os.path.join(base_dir, "_model", yolo_file)
        gcn_path = os.path.join(base_dir, "_model", gcn_file)
        
        yolo_interpreter = load_interpreter(yolo_path, "YOLO Pose")
        gcn_interpreter = load_interpreter(gcn_path, "GCN-LSTM")

        if source_type == 'LOCAL':
            cap = cv2.VideoCapture(int(input_source))
        elif source_type == 'STATIC_FILE':
            file_path = os.path.join(base_dir, "_video_sample", input_source)
            cap = cv2.VideoCapture(file_path)
        else:
            cap = cv2.VideoCapture(input_source)
            
        if cap is None or not cap.isOpened():
            logger.error(f"[{camera_id}] Failed to open video source: {input_source} (type: {source_type})")
            return

        tracker = CentroidTracker(
            max_disappeared=CENTROID_TRACKER_MAX_DISAPPEARED,
            max_distance=CENTROID_TRACKER_MAX_DISTANCE
        )
        
        cluster_buffers = {}
        cluster_labels = {}
        frame_count = 0

        logger.info(f"[{camera_id}] Starting AI Inference Loop...")
        
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 80]
        
        while cap.isOpened():
            t_start = time.time()
            
            ret, frame = cap.read()
            t_read = time.time()
            
            if not ret:
                if isinstance(input_source, str) and not str(input_source).startswith("rtsp"):
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                else:
                    break

            frame = cv2.resize(frame, (YOLO_IMGZ, YOLO_IMGZ))
            t_resize = time.time()
            
            # --- PROSES YOLO POSE ---
            people = yolo_pose_extraction(
                yolo_interpreter=yolo_interpreter,
                frame=frame,
                conf_thresh=YOLO_PERSON_CONFIDENCE_THRESHOLD,
                iou_thresh=YOLO_IOU_THRESHOLD
            )
            t_yolo = time.time()
            
            clusters = spatial_clustering(
                people=people,
                max_distance=SPATIAL_CLUSTERING_MAX_DISTANCE
            )
            
            cluster_centroids = []
            for cluster in clusters:
                cx = sum(p["pelvis"][0] for p in cluster) / len(cluster)
                cy = sum(p["pelvis"][1] for p in cluster) / len(cluster)
                cluster_centroids.append([cx, cy])
                
            tracked = tracker.update(cluster_centroids)
            events = []
            
            for cluster_idx, object_id in tracked.items():
                if object_id not in cluster_buffers:
                    cluster_buffers[object_id] = deque(maxlen=t_frames)
                    cluster_labels[object_id] = {"label": "analyzing", "conf": 0.0}
                    
                cluster_people = clusters[cluster_idx]
                num_people = min(len(cluster_people), m_people)
                frame_pose_data = np.zeros((3, v_joints, m_people))
                absolute_skeletons = []
                
                for m in range(num_people):
                    person = cluster_people[m]
                    frame_pose_data[:, :, m] = person["relative_kpts"]
                    absolute_skeletons.append({
                        "box": person["box"],
                        "keypoints": person["keypoints"]
                    })
                
                cluster_buffers[object_id].append(frame_pose_data)
                
                # --- PROSES GCN-LSTM ---
                new_label, new_conf = gcn_classification(
                    classes,
                    gcn_interpreter,
                    cluster_buffers[object_id],
                    frame_count,
                    t_frames
                )
                
                if new_label is not None and new_conf is not None:
                    cluster_labels[object_id]["label"] = new_label
                    cluster_labels[object_id]["conf"] = new_conf
                    
                current_label = cluster_labels[object_id]["label"]
                current_conf = cluster_labels[object_id]["conf"]
                
                events.append({
                    "group_id": object_id,
                    "label": current_label,
                    "confidence": round(current_conf, 2),
                    "skeletons": absolute_skeletons
                })
                
            active_object_ids = set(tracked.values())
            for obj_id in list(cluster_buffers.keys()):
                if obj_id not in active_object_ids and obj_id not in tracker.objects:
                    del cluster_buffers[obj_id]
                    del cluster_labels[obj_id]
                    
            t_gcn = time.time()
                    
            # Encode frame to JPEG
            ret, jpeg = cv2.imencode('.jpg', frame, encode_param)
            jpeg_bytes = jpeg.tobytes()
            
            # Encode events to JSON
            json_bytes = json.dumps(events).encode('utf-8')
            
            # Transmit (Lengths + Payloads)
            header = struct.pack('>I', len(jpeg_bytes))
            conn.sendall(header + jpeg_bytes)
            
            header_json = struct.pack('>I', len(json_bytes))
            conn.sendall(header_json + json_bytes)
            
            t_transmit = time.time()
            
            if frame_count % 15 == 0:
                logger.info(f"[{camera_id}] PROFILE (ms) - Camera: {(t_read-t_start)*1000:.1f} | Resize: {(t_resize-t_read)*1000:.1f} | YOLO: {(t_yolo-t_resize)*1000:.1f} | GCN+Tracker: {(t_gcn-t_yolo)*1000:.1f} | TX/Network: {(t_transmit-t_gcn)*1000:.1f}")
                
            frame_count += 1
            
    except (ConnectionResetError, BrokenPipeError):
        logger.info(f"Client {addr} disconnected.")
    except Exception as e:
        logger.error(f"Error handling client {addr}: {e}", exc_info=True)
    finally:
        if cap:
            cap.release()
        conn.close()

def start_server(host='127.0.0.1', port=5000):
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((host, port))
    server.listen(5)
    logger.info(f"AI Server listening on {host}:{port}")
    
    try:
        while True:
            conn, addr = server.accept()
            client_thread = threading.Thread(target=handle_client, args=(conn, addr), daemon=True)
            client_thread.start()
    except KeyboardInterrupt:
        logger.info("Shutting down AI Server...")
    finally:
        server.close()

if __name__ == '__main__':
    start_server()
