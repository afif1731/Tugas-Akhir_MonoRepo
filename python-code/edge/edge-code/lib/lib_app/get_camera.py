import aiohttp
import time
import hmac
import hashlib
import logging

logger = logging.getLogger(__name__)

async def fetch_cameras(device_id: str, device_secret: str, backend_url: str):
    """Mengambil list camera dari backend menggunakan HMAC-SHA256 Auth"""
    timestamp = str(int(time.time()))
    
    payload = f"{device_id}:{timestamp}"

    signature = hmac.new(
        device_secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    url = f"{backend_url}/api/edge-device/{device_id}/cameras"
    params = {
        "timestamp": timestamp,
        "signature": signature
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    result = await response.json(content_type=None)
                    # Expected data format: {data: [{id: string, source: string, source_type: string}]}
                    return result.get("data", [])
                else:
                    error_msg = await response.text()
                    logger.error(f"Failed to fetch camera list (Status {response.status}): {error_msg}")
                    if response.status == 404:
                        return []
                    return None
    except Exception as e:
        logger.error(f"Connection error to backend (cameras): {e}")
        return None
