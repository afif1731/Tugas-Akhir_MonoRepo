import json
import asyncio
import logging
from livekit.rtc import DataPacket

from .service.camera_service import CameraService
from lib.lib_app.livekit_message_publish import publish_device_status

logger = logging.getLogger(__name__)

async def route_backend_request(payload: dict, app_context: dict):
    service = payload.get('service')
    method = payload.get('method')
    data = payload.get('data', {})

    if service == 'CAMERA':
        if method == 'patch':
            await CameraService.patch(data, app_context)
            return
        elif method == 'delete':
            await CameraService.delete(data, app_context)
            return
        else:
            logger.warning(f"Method {method} not recognized for service CAMERA")
            return
    
    elif service == 'DEVICE':
        return
    
    else:
        logger.warning(f"Service {service} not recognized")
        return

def device_on_data_received(dp: DataPacket, device_id: str, app_context: dict):
    topic = dp.topic if hasattr(dp, 'topic') else None
    data = dp.data if hasattr(dp, 'data') else None
    
    try:
        if topic == f'backend_request_{device_id}' and data is not None:
            if isinstance(data, bytes):
                payload_str = data.decode('utf-8')
            else:
                payload_str = str(data)
            payload = json.loads(payload_str)
            asyncio.create_task(route_backend_request(payload, app_context))

        elif topic == 'frontend_request_device_status':
            asyncio.create_task(
                publish_device_status(
                    room=app_context['room'],
                    device_id=device_id
                )
            )

    except Exception as e:
        logger.error(f"Failed to process backend_request data: {e}")