import os
import cv2
import time
import asyncio
import logging
import numpy as np
import tflite_runtime.interpreter as tflite

from livekit import rtc
from collections import deque

from lib.livekit_message_publish import publish_violence_detection
from lib.detector import yolo_pose_extraction, gcn_classification
from lib.crowd_cluster import CentroidTracker, spatial_clustering
from lib.utils import validate_file

logger = logging.getLogger(__name__)

_shared_edgetpu_delegate = None

def get_edgetpu_delegate():
    global _shared_edgetpu_delegate
    if _shared_edgetpu_delegate is None:
        delegate_lib = os.getenv('EDGETPU_SHARED_LIB', 'libedgetpu.so.1')
        try:
            logger.info(f"C-LOG: Executing tflite.load_delegate('{delegate_lib}')")
            _shared_edgetpu_delegate = tflite.load_delegate(delegate_lib)
            logger.info("C-LOG: tflite.load_delegate SUCCESS")
        except Exception as e:
            logger.warning(f"Failed to load Edge TPU delegate globally: {e}")
            _shared_edgetpu_delegate = "FAILED"
    return _shared_edgetpu_delegate

def load_interpreter(model_path, camera_id, model_name):
    logger.info(f"C-LOG: Starting model load for {model_name}...")
    delegate = get_edgetpu_delegate()
    
    if delegate is not None and delegate != "FAILED":
        try:
            logger.info("C-LOG: Executing tflite.Interpreter(model_path, delegate)")
            interpreter = tflite.Interpreter(
                model_path=model_path,
                experimental_delegates=[delegate]
            )
            logger.info("C-LOG: tflite.Interpreter SUCCESS")
            
            logger.info("C-LOG: Executing interpreter.allocate_tensors()")
            interpreter.allocate_tensors()
            logger.info("C-LOG: interpreter.allocate_tensors() SUCCESS")
            
            # Referensi tunggal delegate agar aman dari GC
            interpreter._delegate_ref = delegate 
            
            logger.info(f"Successfully loaded {model_name} with Edge TPU delegate for camera {camera_id}.")
            return interpreter
        except Exception as e:
            logger.warning(f"Failed to allocate tensors with Edge TPU delegate for {model_name} (Camera {camera_id}): {e}. Falling back to CPU...")
            
    # Fallback to CPU
    try:
        logger.info("C-LOG: Executing tflite.Interpreter (CPU Fallback)")
        interpreter = tflite.Interpreter(model_path=model_path)
        logger.info("C-LOG: Executing interpreter.allocate_tensors() (CPU Fallback)")
        interpreter.allocate_tensors()
        
        logger.info(f"Successfully loaded {model_name} on CPU for camera {camera_id}.")
        return interpreter
    except Exception as cpu_err:
        logger.error(f"Failed CPU load fallback for {model_name} (Camera {camera_id}): {cpu_err}")
        raise cpu_err

async def run_camera_process(camera, room, config, backend_url):
    """
    Menjalankan proses inferensi dan pengiriman data ke LiveKit untuk satu kamera spesifik.
    """
    camera_id = camera['id']
    input_source = camera['source']
    source_type = camera['source_type']
    
    classes = config['CLASSES']
    t_frames = config['T']
    v_joints = config['V']
    m_people = config['M']

    yolo_file = config.get('YOLO_FILE', 'yolov8n-pose_full_integer_quant_edgetpu.tflite')
    gcn_file = config.get('GCN_FILE', 'GCN_LSTM_best_int8_edgetpu.tflite')

    base_dir = os.path.dirname(os.path.abspath(__file__))
    yolo_path = os.path.join(base_dir, "_model", yolo_file)
    gcn_path = os.path.join(base_dir, "_model", gcn_file)

    logger.info(f"Loading AI Model for camera {camera_id}...")
    try:
        yolo_interpreter = load_interpreter(yolo_path, camera_id, "YOLO Pose")
    except Exception as e:
        logger.error(f"Critical failure loading YOLO model for camera {camera_id}: {e}")
        return

    try:
        gcn_interpreter = load_interpreter(gcn_path, camera_id, "GCN-LSTM")
    except Exception as e:
        logger.error(f"Critical failure loading GCN_LSTM model for camera {camera_id}: {e}")
        return

    livekit_track_name = f"track_{camera_id}"
    
    logger.info(f"Setting up video transmission for camera {camera_id}")
    source = rtc.VideoSource(640, 480)
    track = rtc.LocalVideoTrack.create_video_track(livekit_track_name, source)
    options = rtc.TrackPublishOptions()
    options.source = rtc.TrackSource.SOURCE_CAMERA

    await room.local_participant.publish_track(track, options)

    # --- SETUP KAMERA & BUFFER ---
    cap = None

    if source_type == 'LOCAL':
        cap = cv2.VideoCapture(int(input_source))
    elif source_type == 'STATIC_FILE':
        base_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(base_dir, "_video_sample", input_source)

        await validate_file(file_path, input_source, backend_url)        
        cap = cv2.VideoCapture(file_path)
    else:
        cap = cv2.VideoCapture(input_source)

    tracker = CentroidTracker(max_disappeared=50, max_distance=300)
    cluster_buffers = {}
    cluster_labels = {}
    frame_count = 0

    logger.info(f"Starting processing from source: {input_source} (Camera ID: {camera_id})")

    def process_frame_sync(cap, frame_count):
        ret, frame = cap.read()
        if not ret:
            return False, [], frame
            
        frame = cv2.resize(frame, (640, 480))
        
        # --- PROSES YOLO POSE ---
        people = yolo_pose_extraction(yolo_interpreter, frame)
        clusters = spatial_clustering(people, max_distance=200)
        
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
                cluster_labels[object_id] = {"label": "Analyzing", "conf": 0.0}
                
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
            new_label, new_conf = gcn_classification(classes, gcn_interpreter, cluster_buffers[object_id], frame_count, t_frames)
            
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
                
        return True, events, frame

    prev_time = time.time()
    try:
        while cap.isOpened():
            ret, events, frame = await asyncio.to_thread(
                process_frame_sync, cap, frame_count
            )
            
            if not ret:
                if isinstance(input_source, str) and not str(input_source).startswith("rtsp"):
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                else:
                    break

            current_time = time.time()
            fps = 1.0 / (current_time - prev_time) if (current_time - prev_time) > 0 else 0.0
            prev_time = current_time
            
            detection_data = {
                "camera_id": camera_id,
                "fps": round(fps, 1),
                "events": events
            }

            await publish_violence_detection(detection_data, room)

            # --- TRANSMISI KE REACT (LIVEKIT) ---
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB) # pyright: ignore[reportArgumentType, reportCallIssue]
            
            lk_frame = rtc.VideoFrame(
                width=640, 
                height=480, 
                type=rtc.VideoBufferType.RGB24, 
                data=rgb_frame.tobytes()
            )
            source.capture_frame(lk_frame)
        
            await asyncio.sleep(0.001) 
            frame_count += 1

    except asyncio.CancelledError:
        logger.info(f"Camera task {camera_id} cancelled.")
    finally:
        logger.info(f"Shutting down camera {camera_id}...")
        if cap:
            cap.release()
