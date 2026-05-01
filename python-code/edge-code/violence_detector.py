import os
import cv2
import torch
import asyncio
import numpy as np
from dotenv import load_dotenv
from gcn_model import GCN_LSTM, device, A
from livekit_access_token import fetch_access_token, token_renewal_loop
from collections import deque
from ultralytics import YOLO
from livekit import rtc

# ==========================================
# KONFIGURASI
# ==========================================
load_dotenv()

INPUT_SOURCE = 0

LIVEKIT_URL = os.getenv('LIVEKIT_URL', 'ws://127.0.0.1:7880')
BACKEND_URL = os.getenv('VITE_API_URL', 'http://localhost:4000')
API_KEY = os.getenv('LIVEKIT_API_KEY', 'dev_key')
API_SECRET = os.getenv('LIVEKIT_API_SECRET', 'supersecretvalue')
ROOM_NAME = os.getenv('LIVEKIT_ROOM_NAME', 'surveillance_room')

YOLO_PATH = "./edge-code/_model/yolov8n-pose.pt"
GCN_PATH = "./_model/GCN_LSTM_best.pth"
CAMERA_NAME = "CCTV TW2-701"

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
    
    current_label = "Menganalisis..."
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
        results = yolo_model.track(frame, persist=True, classes=[0], verbose=False)
        annotated_frame = results[0].plot() 
        
        # Ekstraksi Koordinat untuk GCN
        frame_pose_data = np.zeros((3, V, M))
        if results[0].keypoints is not None and results[0].keypoints.data.numel() > 0:
            kpts = results[0].keypoints.data.cpu().numpy()
            num_people = min(len(kpts), M)
            
            for m in range(num_people):
                person_kpts = kpts[m]
                if len(person_kpts) >= 17:
                    hip_l, hip_r = person_kpts[11], person_kpts[12]
                    
                    if hip_l[2] > 0 and hip_r[2] > 0:
                        pelvis_x = (hip_l[0] + hip_r[0]) / 2
                        pelvis_y = (hip_l[1] + hip_r[1]) / 2
                        for v in range(V):
                            if person_kpts[v][2] > 0:
                                frame_pose_data[0, v, m] = person_kpts[v][0] - pelvis_x
                                frame_pose_data[1, v, m] = person_kpts[v][1] - pelvis_y
                                frame_pose_data[2, v, m] = person_kpts[v][2]
        
        pose_buffer.append(frame_pose_data)

        # --- PROSES GCN-LSTM ---
        if len(pose_buffer) == T and frame_count % 5 == 0:
            tensor_data = np.stack(pose_buffer, axis=1) 
            tensor_data = np.max(tensor_data, axis=-1)  
            
            input_tensor = torch.tensor(tensor_data, dtype=torch.float32).unsqueeze(0).to(device)
            with torch.no_grad():
                output = gcn_lstm_model(input_tensor, A)
                probs = torch.softmax(output, dim=1)[0]
                class_idx = torch.argmax(probs).item()
                current_label = CLASSES[class_idx]
                current_conf = probs[class_idx].item()

        # --- RENDERING UI ---
        color = (0, 0, 255) if current_label in ['assault', 'fighting', 'shooting', 'robbery'] else (0, 255, 0)
        
        cv2.rectangle(annotated_frame, (10, 10), (450, 60), (0, 0, 0), -1)
        cv2.putText(annotated_frame, f"STATUS: {current_label.upper()} ({current_conf:.2f})", 
                    (20, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

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