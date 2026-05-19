import os
import aiohttp
import logging

logger = logging.getLogger(__name__)

async def validate_file(file_path: str, input_source: str, backend_url: str):
    if not os.path.exists(file_path):
        logger.info(f"File not found: {file_path}. Downloading from backend...")
        url = f"{backend_url}/uploads/sample-video/{input_source}"
        try:
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        with open(file_path, 'wb') as f:
                            while True:
                                chunk = await response.content.read(8192)
                                if not chunk:
                                    break
                                f.write(chunk)
                        logger.info(f"Successfully downloaded: {file_path}")
                    else:
                        logger.warning(f"Failed to download {input_source} from backend (Status {response.status})")
        except Exception as e:
            logger.error(f"Error downloading file: {e}")