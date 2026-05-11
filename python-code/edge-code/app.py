import os
import json
import torch
import psutil
import asyncio
from dotenv import load_dotenv
from ultralytics import YOLO
from livekit.rtc import Room

from lib.gcn_model import GCN_LSTM, device
from lib.livekit_message_publish import device_status_loop
from lib.livekit_access_token import fetch_access_token, token_renewal_loop
from violence_detector import run_camera_process

load_dotenv()

LIVEKIT_URL = os.getenv('LIVEKIT_URL', 'ws://127.0.0.1:7880')
BACKEND_URL = os.getenv('VITE_API_URL', 'http://localhost:4000')

DEVICE_SECRET = os.getenv('LIVEKIT_DEVICE_SECRET', 'supersecretvalue')
ROOM_NAME = os.getenv('LIVEKIT_ROOM_NAME', 'surveillance_room')

YOLO_PATH = "./edge-code/_model/yolov8n-pose.pt"
GCN_PATH = "./_model/GCN_LSTM_best.pth"

DEVICE_ID = "019cf0e8-c7c5-7ad1-b796-dcb62eb5ec19"

CAMERAS = [
    {
        "id": "019cf0ea-cfe6-7d61-bd35-ee71fbbf8c2d",
        "source": "0",
        "source_type": "LOCAL"
    },
    {
        "id": "019e0d16-6faf-798b-94e2-48a3090347af",
        "source": "fighting_sample_1.mp4",
        "source_type": "STATIC_FILE"
    }
]

CLASSES = ['assault', 'fighting', 'shooting', 'robbery', 'normal_event']
T, V, M = 100, 17, 3  # Time frames, Vertices (joints), Max People
HIDDEN_GCN = 128
HIDDEN_LSTM = 128
LSTM_LAYERS = 2
DROPOUT = 0.4888916045569277

CONFIG = {
    "CLASSES": CLASSES,
    "T": T,
    "V": V,
    "M": M
}

print("[INFO] Memuat Model AI...")
yolo_model = YOLO(YOLO_PATH)

gcn_lstm_model = GCN_LSTM(
    num_classes=len(CLASSES),
    in_channels=3,
    hidden_gcn=HIDDEN_GCN,
    hidden_lstm=HIDDEN_LSTM,
    lstm_layers=LSTM_LAYERS,
    dropout=DROPOUT
).to(device)

try:
    gcn_lstm_model.load_state_dict(torch.load(GCN_PATH, map_location=device))
    gcn_lstm_model.eval()
except Exception as e:
    print(f"[WARNING] Gagal memuat bobot GCN_LSTM: {e}")

async def main():
    print(f"[INFO] Requesting LiveKit Token...")
    token = await fetch_access_token(
        device_id=DEVICE_ID,
        device_secret=DEVICE_SECRET,
        backend_url=BACKEND_URL
    )
    
    if not token:
        print("[CRITICAL] Tidak dapat memulai platform: Gagal mendapatkan akses token dari backend.")
        return

    print("[INFO] Menghubungkan ke LiveKit Server...")
    room = Room()
    await room.connect(LIVEKIT_URL, token)
    print("[INFO] Terhubung ke WebRTC Room!")

    # Start token renewal background task
    asyncio.create_task(token_renewal_loop(
        device_id=DEVICE_ID,
        device_secret=DEVICE_SECRET,
        backend_url=BACKEND_URL
    ))

    # Start device status telemetry loop
    asyncio.create_task(device_status_loop(room, DEVICE_ID))

    # Jalankan proses pendeteksi untuk setiap kamera
    tasks = []
    for camera in CAMERAS:
        print(f"[INFO] Menyiapkan proses kamera untuk ID: {camera['id']}")
        task = asyncio.create_task(
            run_camera_process(
                camera=camera,
                room=room,
                yolo_model=yolo_model,
                gcn_lstm_model=gcn_lstm_model,
                config=CONFIG
            )
        )
        tasks.append(task)

    await asyncio.gather(*tasks)

    print("[INFO] Mematikan Koneksi...")
    await room.disconnect()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[INFO] Edge Device dihentikan oleh pengguna.")
