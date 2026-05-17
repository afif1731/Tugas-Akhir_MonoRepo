import os
import cv2
import time
import asyncio
import aiohttp
import logging
from collections import deque
from livekit import rtc

from ultralytics import YOLO
import tflite_runtime.interpreter as tflite

logger = logging.getLogger(__name__)

from lib.detector import yolo_pose_extraction, gcn_classification
from lib.livekit_message_publish import publish_violence_detection

async def validate_file(file_path: str, input_source: str, backend_url: str):
    if not os.path.exists(file_path):
        logger.info(f"File not found: {file_path}. Downloading from backend...")
        url = f"{backend_url}/uploads/sample-video/{input_source}"
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        with open(file_path, 'wb') as f:
                            while True:
                                chunk = await response.content.read(8192)
                                if not chunk:
                                    break
                                f.write(chunk)
                        logger.info(f"Successfully downloaded: {file_path}")
                    else:
                        logger.warning(f"Failed to download {input_source} from backend (Status {response.status})")
        except Exception as e:
            logger.error(f"Error downloading file: {e}")

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

    base_dir = os.path.dirname(os.path.abspath(__file__))
    yolo_path = os.path.join(base_dir, "_model", "yolov8n-pose_full_integer_quant_edgetpu.tflite")
    gcn_path = os.path.join(base_dir, "_model", "GCN_LSTM_best_int8_edgetpu.tflite")

    logger.info(f"Loading AI Model for camera {camera_id} (Edge TPU)...")
    yolo_model = YOLO(yolo_path, task='pose')

    try:
        gcn_interpreter = tflite.Interpreter(
            model_path=gcn_path,
            experimental_delegates=[tflite.load_delegate('libedgetpu.so.1.0')]
        )
        gcn_interpreter.allocate_tensors()
    except Exception as e:
        logger.error(f"Failed to load GCN_LSTM Edge TPU delegate for camera {camera_id}: {e}")
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

    match source_type:
        case 'LOCAL':
            cap = cv2.VideoCapture(int(input_source))
        case 'STATIC_FILE':
            base_dir = os.path.dirname(os.path.abspath(__file__))
            file_path = os.path.join(base_dir, "_video_sample", input_source)

            await validate_file(file_path, input_source, backend_url)        
            cap = cv2.VideoCapture(file_path)
        case _:
            cap = cv2.VideoCapture(input_source)

    pose_buffer = deque(maxlen=t_frames)
    frame_count = 0
    
    current_label = "Analyzing"
    current_conf = 0.0

    logger.info(f"Starting processing from source: {input_source} (Camera ID: {camera_id})")

    def process_frame_sync(cap, pose_buffer, frame_count):
        ret, frame = cap.read()
        if not ret:
            return False, None, None, None, None
            
        frame = cv2.resize(frame, (640, 480))
        
        # --- PROSES YOLO POSE ---
        frame_pose_data, annotated_frame = yolo_pose_extraction(yolo_model, frame, v_joints, m_people)
        pose_buffer.append(frame_pose_data)

        # --- PROSES GCN-LSTM ---
        new_label, new_conf = gcn_classification(classes, gcn_interpreter, pose_buffer, frame_count, t_frames)
        
        return True, annotated_frame, new_label, new_conf, frame

    prev_time = time.time()
    try:
        while cap.isOpened():
            ret, annotated_frame, new_label, new_conf, frame = await asyncio.to_thread(
                process_frame_sync, cap, pose_buffer, frame_count
            )
            
            if not ret:
                if isinstance(input_source, str) and not str(input_source).startswith("rtsp"):
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                else:
                    break

            if new_label is not None and new_conf is not None:
                current_label = new_label
                current_conf = new_conf
            
            current_time = time.time()
            fps = 1.0 / (current_time - prev_time) if (current_time - prev_time) > 0 else 0.0
            prev_time = current_time
            
            detection_data = {
                "label": current_label,
                "confidence": round(current_conf, 2),
                "camera_id": camera_id,
                "fps": round(fps, 1)
            }

            await publish_violence_detection(detection_data, room)

            # --- TRANSMISI KE REACT (LIVEKIT) ---
            rgb_frame = cv2.cvtColor(annotated_frame, cv2.COLOR_BGR2RGB) # pyright: ignore[reportArgumentType, reportCallIssue]
            
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
