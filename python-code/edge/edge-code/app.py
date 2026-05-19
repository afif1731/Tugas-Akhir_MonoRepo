import os
import json
import asyncio
import logging
import signal
from uuid6 import uuid7
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
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:4000')

DEVICE_SECRET = os.getenv('LIVEKIT_DEVICE_SECRET', 'supersecretvalue')

DEVICE_ID = os.getenv('DEVICE_ID', 'not_set')

if DEVICE_ID == 'not_set':
    logger.warning("Device ID not found, generating a new DEVICE_ID (Device ID will change every time the application restarts)")
    DEVICE_ID = str(uuid7())

YOLO_FILE = os.getenv('YOLO_FILE', 'yolov8n-pose_full_integer_quant_edgetpu.tflite')
GCN_FILE = os.getenv('GCN_FILE', 'GCN_LSTM_best_int8_edgetpu.tflite')

CAMERAS = []

CLASSES = ['assault', 'fighting', 'shooting', 'robbery', 'normal_event']
T, V, M = 100, 17, 3  # Time frames, Vertices (joints), Max People

CONFIG = {
    "CLASSES": CLASSES,
    "T": T,
    "V": V,
    "M": M,
    "YOLO_FILE": YOLO_FILE,
    "GCN_FILE": GCN_FILE
}

async def main():
    global CAMERAS
    
    shutdown_event = asyncio.Event()

    def handle_shutdown():
        logger.info("Received shutdown signal, shutting down...")
        shutdown_event.set()

    # Register signal handlers for graceful shutdown (Windows relies on Ctrl+C but works with SIGTERM/SIGINT if sent)
    for sig in ('SIGINT', 'SIGTERM'):
        try:
            loop = asyncio.get_running_loop()
            loop.add_signal_handler(getattr(signal, sig), handle_shutdown)
        except NotImplementedError:
            pass

    logger.info(f"Requesting LiveKit Token from {BACKEND_URL}...")
    token: str | None = None
    while not token and not shutdown_event.is_set():
        token = await fetch_access_token(
            device_id=DEVICE_ID,
            device_secret=DEVICE_SECRET,
            backend_url=BACKEND_URL
        )
        if not token:
            logger.error("Failed to retrieve access token from backend. Retrying in 10 seconds...")
            try:
                await asyncio.wait_for(shutdown_event.wait(), timeout=10.0)
            except asyncio.TimeoutError:
                pass

    if shutdown_event.is_set():
        return

    logger.info(f"Connecting to LiveKit Server {LIVEKIT_URL}...")
    room = Room()
    await room.connect(LIVEKIT_URL, str(token))
    logger.info("Connected to WebRTC Room!")

    # Start token renewal background task
    token_task = asyncio.create_task(token_renewal_loop(
        device_id=DEVICE_ID,
        device_secret=DEVICE_SECRET,
        backend_url=BACKEND_URL
    ))

    # Start device status telemetry loop
    status_task = asyncio.create_task(device_status_loop(room, DEVICE_ID))

    logger.info("Fetching camera configurations...")
    fetched_cameras = None
    while fetched_cameras is None and not shutdown_event.is_set():
        fetched_cameras = await fetch_cameras(
            device_id=DEVICE_ID,
            device_secret=DEVICE_SECRET,
            backend_url=BACKEND_URL
        )
        if fetched_cameras is None:
            logger.error("Failed to fetch camera configurations. Retrying in 10 seconds...")
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
        
        if topic == f'backend_request_{DEVICE_ID}' and data is not None:
            try:
                if isinstance(data, bytes):
                    payload_str = data.decode('utf-8')
                else:
                    payload_str = str(data)
                payload = json.loads(payload_str)
                asyncio.create_task(route_backend_request(payload, app_context))
            except Exception as e:
                logger.error(f"Failed to process backend_request data: {e}")

    for camera in CAMERAS:
        logger.info(f"Setting up camera process for ID: {camera['id']}")
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
        logger.info("No cameras configured. Edge Device running in idle mode.")

    await shutdown_event.wait()

    logger.info("Shutdown process initiated. Cancelling all tasks...")
    
    for _, task in active_tasks.items():
        task.cancel()
    
    # Wait for tasks to cancel
    if active_tasks:
        await asyncio.gather(*active_tasks.values(), return_exceptions=True)
        
    token_task.cancel()
    status_task.cancel()

    logger.info("Disconnecting...")
    await room.disconnect()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Edge Device stopped manually (KeyboardInterrupt).")
