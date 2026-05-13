import os
import sys
import json
import asyncio
import logging
import signal
from dotenv import load_dotenv
from livekit.rtc import Room
from livekit import rtc
from lib.livekit_message_publish import device_status_loop
from lib.livekit_access_token import fetch_access_token, token_renewal_loop
from lib.get_camera import fetch_cameras
from consumer.routes import route_backend_request
from violence_detector import run_camera_process

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

load_dotenv()

LIVEKIT_URL = os.getenv('LIVEKIT_URL', 'ws://127.0.0.1:7880')
BACKEND_URL = os.getenv('VITE_API_URL', 'http://localhost:4000')

DEVICE_SECRET = os.getenv('LIVEKIT_DEVICE_SECRET', 'supersecretvalue')
ROOM_NAME = os.getenv('LIVEKIT_ROOM_NAME', 'surveillance_room')

USE_TPU = os.getenv('USE_TPU', 'False').lower() in ('true', '1', 't')
DEVICE_ID = os.getenv('EDGE_DEVICE_ID', 'not_set')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
YOLO_PATH = os.path.join(BASE_DIR, "_model", "yolov8n-pose.pt")
GCN_PATH = os.path.join(BASE_DIR, "_model", "GCN_LSTM_best.pth")

if(DEVICE_ID == 'not_set'):
    logger.error('Cannot find EDGE_DEVICE_ID in environment')
    sys.exit(1)

CAMERAS = []

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
    "M": M,
    "USE_TPU": USE_TPU
}


async def main():
    global CAMERAS
    
    shutdown_event = asyncio.Event()

    def handle_shutdown():
        logger.info("Menerima sinyal shutdown, sedang mematikan...")
        shutdown_event.set()

    # Register signal handlers for graceful shutdown (Windows relies on Ctrl+C but works with SIGTERM/SIGINT if sent)
    for sig in ('SIGINT', 'SIGTERM'):
        try:
            loop = asyncio.get_running_loop()
            loop.add_signal_handler(getattr(signal, sig), handle_shutdown)
        except NotImplementedError:
            pass

    logger.info("Requesting LiveKit Token...")
    token: str | None = None
    while not token and not shutdown_event.is_set():
        token = await fetch_access_token(
            device_id=DEVICE_ID,
            device_secret=DEVICE_SECRET,
            backend_url=BACKEND_URL
        )
        if not token:
            logger.error("Gagal mendapatkan akses token dari backend. Mencoba lagi dalam 10 detik...")
            try:
                await asyncio.wait_for(shutdown_event.wait(), timeout=10.0)
            except asyncio.TimeoutError:
                pass

    if shutdown_event.is_set():
        return

    logger.info("Menghubungkan ke LiveKit Server...")
    room = Room()
    await room.connect(LIVEKIT_URL, str(token))
    logger.info("Terhubung ke WebRTC Room!")

    # Start token renewal background task
    token_task = asyncio.create_task(token_renewal_loop(
        device_id=DEVICE_ID,
        device_secret=DEVICE_SECRET,
        backend_url=BACKEND_URL
    ))

    # Start device status telemetry loop
    status_task = asyncio.create_task(device_status_loop(room, DEVICE_ID))

    logger.info("Mengambil konfigurasi kamera...")
    fetched_cameras = None
    while fetched_cameras is None and not shutdown_event.is_set():
        fetched_cameras = await fetch_cameras(
            device_id=DEVICE_ID,
            device_secret=DEVICE_SECRET,
            backend_url=BACKEND_URL
        )
        if fetched_cameras is None:
            logger.error("Gagal mengambil konfigurasi kamera. Mencoba lagi dalam 10 detik...")
            try:
                await asyncio.wait_for(shutdown_event.wait(), timeout=10.0)
            except asyncio.TimeoutError:
                pass
                
    if shutdown_event.is_set():
        await room.disconnect()
        return

    CAMERAS = fetched_cameras if fetched_cameras else []

    active_tasks = {}
    app_context = {
        'active_tasks': active_tasks,
        'cameras': CAMERAS,
        'room': room,
        'config': CONFIG,
        'backend_url': BACKEND_URL
    }

    @room.on("data_received")
    def on_data_received(dp: rtc.DataPacket):
        topic = dp.topic if hasattr(dp, 'topic') else None
        data = dp.data if hasattr(dp, 'data') else None
        
        if topic == 'backend_request' and data is not None:
            try:
                if isinstance(data, bytes):
                    payload_str = data.decode('utf-8')
                else:
                    payload_str = str(data)
                payload = json.loads(payload_str)
                asyncio.create_task(route_backend_request(payload, app_context))
            except Exception as e:
                logger.error(f"Gagal memproses data backend_request: {e}")

    for camera in CAMERAS:
        logger.info(f"Menyiapkan proses kamera untuk ID: {camera['id']}")
        task = asyncio.create_task(
            run_camera_process(
                camera=camera,
                room=room,
                config=CONFIG,
                backend_url=BACKEND_URL
            )
        )
        active_tasks[camera['id']] = task

    if not active_tasks:
        logger.info("Tidak ada kamera yang dikonfigurasi. Edge Device berjalan dalam mode idle.")

    await shutdown_event.wait()

    logger.info("Proses shutdown dimulai. Membatalkan semua task...")
    
    for _, task in active_tasks.items():
        task.cancel()
    
    # Wait for tasks to cancel
    if active_tasks:
        await asyncio.gather(*active_tasks.values(), return_exceptions=True)
        
    token_task.cancel()
    status_task.cancel()

    logger.info("Mematikan Koneksi...")
    await room.disconnect()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Edge Device dihentikan secara manual (KeyboardInterrupt).")
