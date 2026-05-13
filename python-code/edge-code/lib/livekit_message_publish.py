import json
import psutil
import asyncio
import logging
from livekit.rtc import Room

logger = logging.getLogger(__name__)

async def device_status_loop(room: Room, device_id: str):
    """Loop background untuk mengirim status (telemetri) edge device ke backend setiap 5 detik"""
    while True:
        try:
            cpu = psutil.cpu_percent(interval=None)
            mem = psutil.virtual_memory()
            ram = mem.used
            disk = psutil.disk_usage('/')
            storage = disk.used

            payload = {
                "id": device_id,
                "cpu": round(cpu, 2),
                "ram": round(ram / (1024 * 1024 * 1024), 2) ,
                "storage": round(storage / (1024 * 1024 * 1024), 2)
            }
            
            payload_bytes = json.dumps(payload).encode('utf-8')
            
            await room.local_participant.publish_data(
                payload_bytes,
                reliable=False,
                topic='device_status'
            )
        except Exception as e:
            logger.error(f"Gagal mengirim device status: {e}")
            
        await asyncio.sleep(5)

async def publish_violence_detection(detection_data: dict, room: Room):
    payload_bytes = json.dumps(detection_data).encode('utf-8')

    await room.local_participant.publish_data(
        payload_bytes,
        reliable=False,
        topic='violence_detection'
    )