import asyncio
import logging

from lib.lib_app.camera_process import run_camera_process

logger = logging.getLogger(__name__)

class CameraService:
    @staticmethod
    async def create(data: dict, app_context: dict):
        camera_id = data.get('id')
        source = data.get('source')
        source_type = data.get('source_type')
        rtsp_username = data.get('rtsp_username')
        rtsp_password = data.get('rtsp_password')
        rtsp_ip = data.get('rtsp_ip')
        rtsp_authtag = data.get('rtsp_authtag')
        
        active_tasks = app_context['active_tasks']
        cameras = app_context['cameras']
        room = app_context['room']
        config = app_context['config']
        backend_url = app_context['backend_url']

        logger.info(f"Received CREATE request for camera {camera_id}")

        if camera_id in active_tasks:
            logger.warning(f"Task for camera {camera_id} already exists, skipping create.")
            return

        camera_data = {
            'id': camera_id,
            'source': source,
            'source_type': source_type,
            'rtsp_username': rtsp_username,
            'rtsp_password': rtsp_password,
            'rtsp_ip': rtsp_ip,
            'rtsp_authtag': rtsp_authtag
        }
        cameras.append(camera_data)
        
        logger.info(f"Starting task for new camera {camera_id}")
        new_task = asyncio.create_task(
            run_camera_process(
                camera=camera_data,
                room=room,
                config=config,
                backend_url=backend_url,
                device_secret=app_context.get('device_secret')
            )
        )
        active_tasks[camera_id] = new_task

    @staticmethod
    async def patch(data: dict, app_context: dict):
        camera_id = data.get('id')
        new_source = data.get('source')
        new_source_type = data.get('source_type')
        rtsp_username = data.get('rtsp_username')
        rtsp_password = data.get('rtsp_password')
        rtsp_ip = data.get('rtsp_ip')
        rtsp_authtag = data.get('rtsp_authtag')
        
        active_tasks = app_context['active_tasks']
        cameras = app_context['cameras']
        room = app_context['room']
        config = app_context['config']
        backend_url = app_context['backend_url']

        logger.info(f"Received PATCH request for camera {camera_id}")

        # Cancel existing task if it exists
        if camera_id in active_tasks:
            logger.info(f"Cancelling old task for camera {camera_id}")
            task = active_tasks[camera_id]
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            del active_tasks[camera_id]
        
        # Update global CAMERAS list
        camera_data = next((c for c in cameras if c['id'] == camera_id), None)
        if camera_data:
            camera_data['source'] = new_source
            camera_data['source_type'] = new_source_type
            camera_data['rtsp_username'] = rtsp_username
            camera_data['rtsp_password'] = rtsp_password
            camera_data['rtsp_ip'] = rtsp_ip
            camera_data['rtsp_authtag'] = rtsp_authtag
        else:
            camera_data = {
                'id': camera_id,
                'source': new_source,
                'source_type': new_source_type,
                'rtsp_username': rtsp_username,
                'rtsp_password': rtsp_password,
                'rtsp_ip': rtsp_ip,
                'rtsp_authtag': rtsp_authtag
            }
            cameras.append(camera_data)
        
        # Start new task
        logger.info(f"Restarting task for camera {camera_id}")
        new_task = asyncio.create_task(
            run_camera_process(
                camera=camera_data,
                room=room,
                config=config,
                backend_url=backend_url,
                device_secret=app_context.get('device_secret')
            )
        )
        active_tasks[camera_id] = new_task

    @staticmethod
    async def delete(data: dict, app_context: dict):
        camera_id = data.get('id')
        active_tasks = app_context['active_tasks']
        cameras = app_context['cameras']

        logger.info(f"Received DELETE request for camera {camera_id}")

        # Cancel task
        if camera_id in active_tasks:
            logger.info(f"Cancelling task for camera {camera_id}")
            task = active_tasks[camera_id]
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            del active_tasks[camera_id]
        
        # Remove from global CAMERAS list
        cameras[:] = [c for c in cameras if c['id'] != camera_id]
