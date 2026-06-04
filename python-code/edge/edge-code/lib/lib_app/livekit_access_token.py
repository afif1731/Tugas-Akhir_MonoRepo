import aiohttp
import time
import hmac
import hashlib
import asyncio
import logging

logger = logging.getLogger(__name__)

async def fetch_access_token(device_id: str, device_secret: str, backend_url: str):
    """Mengambil token dari backend menggunakan HMAC-SHA256 Auth"""
    timestamp = str(int(time.time()))
    
    payload = f"{device_id}:{timestamp}"

    signature = hmac.new(
        device_secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    url = f"{backend_url}/api/livekit/access-token/device"
    params = {
        "device_id": device_id,
        "timestamp": timestamp,
        "signature": signature
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    result = await response.json(content_type=None)
                    return result.get("data", {}).get("token")
                else:
                    error_msg = await response.text()
                    logger.error(f"Failed to fetch token (Status {response.status}): {error_msg}")
                    return None
    except Exception as e:
        logger.error(f"Connection error to backend: {e}")
        return None

async def token_renewal_loop(device_id: str, device_secret: str, backend_url: str):
    """Loop background untuk memperbarui token setiap 5 jam 45 menit"""
    # 5 jam 45 menit = 20700 detik
    renewal_interval = (5 * 3600) + (45 * 60)
    
    while True:
        await asyncio.sleep(renewal_interval)
        logger.info("Starting automatic LiveKit token renewal...")
        new_token = await fetch_access_token(device_id, device_secret, backend_url)
        
        if new_token:
            logger.info("Token successfully renewed from backend!")
        else:
            logger.warning("Failed to renew token. Will retry in the next cycle.")