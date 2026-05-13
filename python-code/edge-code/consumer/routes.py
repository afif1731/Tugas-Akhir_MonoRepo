import logging
from .service.camera_service import CameraService

logger = logging.getLogger(__name__)

async def route_backend_request(payload: dict, app_context: dict):
    service = payload.get('service')
    method = payload.get('method')
    data = payload.get('data', {})

    match service:
        case 'CAMERA':
            match method:
                case 'patch':
                    await CameraService.patch(data, app_context)
                    pass
                case 'delete':
                    await CameraService.delete(data, app_context)
                    pass
                case _:
                    logger.warning(f"Method {method} tidak dikenali untuk service CAMERA")
                    pass
        
        case 'DEVICE':
            pass
        
        case _:
            logger.warning(f"Method {method} tidak dikenali untuk service CAMERA")
            pass
