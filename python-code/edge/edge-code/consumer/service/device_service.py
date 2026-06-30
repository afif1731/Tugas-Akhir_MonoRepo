import asyncio
import logging
from lib.lib_app.camera_process import run_camera_process

logger = logging.getLogger(__name__)

class DeviceService:
    @staticmethod
    async def ai_shutdown(data: dict, app_context: dict):
        active_tasks = app_context['active_tasks']
        cameras = app_context['cameras']
        room = app_context['room']
        config = app_context['config']
        backend_url = app_context['backend_url']

        logger.info("Received AI-SHUTDOWN request for the device. Disabling AI inference for all cameras.")
        
        # Disable AI flag in global config
        config['run_ai'] = False

        # Restart all camera tasks with the new config
        for camera_id, task in list(active_tasks.items()):
            logger.info(f"Restarting task for camera {camera_id} without AI.")
            
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            
            camera_data = next((c for c in cameras if c['id'] == camera_id), None)
            
            if camera_data:
                new_task = asyncio.create_task(
                    run_camera_process(
                        camera=camera_data,
                        room=room,
                        config=config,
                        backend_url=backend_url,
                        device_secret=app_context.get('device_secret') # Fetching secret from context
                    )
                )
                active_tasks[camera_id] = new_task
            else:
                del active_tasks[camera_id]

    @staticmethod
    async def ai_activate(data: dict, app_context: dict):
        active_tasks = app_context['active_tasks']
        cameras = app_context['cameras']
        room = app_context['room']
        config = app_context['config']
        backend_url = app_context['backend_url']

        logger.info("Received AI-ACTIVATE request for the device. Enabling AI inference for all cameras.")
        
        # Enable AI flag in global config
        config['run_ai'] = True

        # Restart all camera tasks with the new config
        for camera_id, task in list(active_tasks.items()):
            logger.info(f"Restarting task for camera {camera_id} with AI.")
            
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            
            camera_data = next((c for c in cameras if c['id'] == camera_id), None)
            
            if camera_data:
                new_task = asyncio.create_task(
                    run_camera_process(
                        camera=camera_data,
                        room=room,
                        config=config,
                        backend_url=backend_url,
                        device_secret=app_context.get('device_secret') # Fetching secret from context
                    )
                )
                active_tasks[camera_id] = new_task
            else:
                del active_tasks[camera_id]
