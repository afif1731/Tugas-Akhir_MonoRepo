import cv2
import time
import asyncio
from collections import deque
from livekit import rtc

from lib.detector import yolo_pose_extraction, gcn_classification
from lib.livekit_message_publish import publish_violence_detection

async def run_camera_process(camera, room, yolo_model, gcn_lstm_model, config):
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

    livekit_track_name = f"track_{camera_id}"
    
    print(f"[INFO] Mulai menyiapkan transmisi video untuk kamera {camera_id}")
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
            cap = cv2.VideoCapture(f"./edge-code/_video_sample/{input_source}")
        case _:
            cap = cv2.VideoCapture(input_source)

    pose_buffer = deque(maxlen=t_frames)
    frame_count = 0
    
    current_label = "Analyzing"
    current_conf = 0.0

    print(f"[INFO] Memulai pemrosesan dari sumber: {input_source} (Camera ID: {camera_id})")

    prev_time = time.time()
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            if isinstance(input_source, str) and not str(input_source).startswith("rtsp"):
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
            else:
                break

        frame = cv2.resize(frame, (640, 480))
        
        # --- PROSES YOLO POSE ---
        frame_pose_data, annotated_frame = yolo_pose_extraction(yolo_model, frame, v_joints, m_people)
        pose_buffer.append(frame_pose_data)

        # --- PROSES GCN-LSTM ---
        new_label, new_conf = gcn_classification(classes, gcn_lstm_model, pose_buffer, frame_count, t_frames)

        if(new_label is not None and new_conf is not None):
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
        rgb_frame = cv2.cvtColor(annotated_frame, cv2.COLOR_BGR2RGB)
        
        lk_frame = rtc.VideoFrame(
            width=640, 
            height=480, 
            type=rtc.VideoBufferType.RGB24, 
            data=rgb_frame.tobytes()
        )
        source.capture_frame(lk_frame)
        
        await asyncio.sleep(0.001) 
        frame_count += 1

    print(f"[INFO] Mematikan Kamera {camera_id}...")
    cap.release()