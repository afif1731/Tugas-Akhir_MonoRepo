import os
import cv2
import json
import torch
import asyncio
from dotenv import load_dotenv
from collections import deque
from ultralytics import YOLO
from livekit import rtc

from lib.detector import yolo_pose_extraction, gcn_classification
from lib.gcn_model import GCN_LSTM, device
from lib.livekit_access_token import fetch_access_token, token_renewal_loop

# ==========================================
# KONFIGURASI
# ==========================================
load_dotenv()

# INPUT_SOURCE = 0
INPUT_SOURCE = "./edge-code/_video_sample/fighting_sample_1.mp4"

LIVEKIT_URL = os.getenv('LIVEKIT_URL', 'ws://127.0.0.1:7880')
BACKEND_URL = os.getenv('VITE_API_URL', 'http://localhost:4000')

API_SECRET = os.getenv('LIVEKIT_API_SECRET', 'supersecretvalue')
ROOM_NAME = os.getenv('LIVEKIT_ROOM_NAME', 'surveillance_room')

YOLO_PATH = "./edge-code/_model/yolov8n-pose.pt"
GCN_PATH = "./_model/GCN_LSTM_best.pth"

DEVICE_ID = "019cf0e8-c7c5-7ad1-b796-dcb62eb5ec19"
CAMERA_ID = "019cf0ea-cfe6-7d61-bd35-ee71fbbf8c2d"
LIVEKIT_TRACK_NAME = f"track_{CAMERA_ID}"

CLASSES = ['assault', 'fighting', 'shooting', 'robbery', 'normal_event']
T, V, M = 100, 17, 3  # Time frames, Vertices (joints), Max People

HIDDEN_GCN = 64
HIDDEN_LSTM = 256
LSTM_LAYERS = 1

print("[INFO] Memuat Model AI...")

yolo_model = YOLO(YOLO_PATH)

gcn_lstm_model = GCN_LSTM(
    hidden_gcn=HIDDEN_GCN,
    hidden_lstm=HIDDEN_LSTM,
    lstm_layers=LSTM_LAYERS
).to(device)

gcn_lstm_model.load_state_dict(torch.load(GCN_PATH, map_location=device))
gcn_lstm_model.eval()

async def main():
    # --- SETUP LIVEKIT ---
    print("[INFO] Meminta token awal dari backend...")
    token = await fetch_access_token(
        device_id=DEVICE_ID,
        camera_id=CAMERA_ID,
        api_secret=API_SECRET,
        backend_url=BACKEND_URL
    )
    
    if not token:
        print("[CRITICAL] Tidak dapat memulai platform: Gagal mendapatkan akses token dari backend.")
        return

    print("[INFO] Menghubungkan ke LiveKit Server...")

    room = rtc.Room()
    await room.connect(LIVEKIT_URL, token)
    
    print("[INFO] Terhubung ke WebRTC Room!")

    asyncio.create_task(token_renewal_loop(
        device_id=DEVICE_ID,
        camera_id=CAMERA_ID,
        api_secret=API_SECRET,
        backend_url=BACKEND_URL
    ))

    # Buat jalur transmisi video
    source = rtc.VideoSource(640, 480)
    track = rtc.LocalVideoTrack.create_video_track(LIVEKIT_TRACK_NAME, source)
    options = rtc.TrackPublishOptions()
    options.source = rtc.TrackSource.SOURCE_CAMERA

    await room.local_participant.publish_track(track, options)

    # --- SETUP KAMERA & BUFFER ---
    cap = cv2.VideoCapture(INPUT_SOURCE)
    pose_buffer = deque(maxlen=T)
    frame_count = 0
    
    current_label = "Analyzing"
    current_conf = 0.0

    print(f"[INFO] Memulai pemrosesan dari sumber: {INPUT_SOURCE}")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            if isinstance(INPUT_SOURCE, str) and not INPUT_SOURCE.startswith("rtsp"):
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
            else:
                break

        frame = cv2.resize(frame, (640, 480))
        
        # --- PROSES YOLO POSE ---
        frame_pose_data, annotated_frame = yolo_pose_extraction(yolo_model, frame, V, M)
        pose_buffer.append(frame_pose_data)

        # --- PROSES GCN-LSTM ---
        new_label, new_conf = gcn_classification(CLASSES, gcn_lstm_model, pose_buffer, frame_count, T)

        if(new_label is not None and new_conf is not None):
            current_label = new_label
            current_conf = new_conf
        
        detection_data = {
            "label": current_label,
            "confidence": round(current_conf, 2),
            "camera_id": CAMERA_ID
        }

        payload_bytes = json.dumps(detection_data).encode('utf-8')

        await room.local_participant.publish_data(
            payload_bytes,
            reliable=False
        )

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

    print("[INFO] Mematikan Kamera dan Koneksi...")
    cap.release()
    await room.disconnect()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("[INFO] Edge Device dihentikan oleh pengguna.")