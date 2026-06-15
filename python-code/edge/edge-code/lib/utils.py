import os
import aiohttp
import logging
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag

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

def derive_key(secret: str) -> bytes:
    return hashlib.sha256(secret.encode('utf-8')).digest()

def text_aes_decrypt(encrypted_hex: str, iv_hex: str, auth_tag_hex: str, secret: str) -> str:
    key = derive_key(secret)

    iv = bytes.fromhex(iv_hex)
    ciphertext = bytes.fromhex(encrypted_hex)
    auth_tag = bytes.fromhex(auth_tag_hex)

    data_to_decrypt = ciphertext + auth_tag

    try:
        aesgcm = AESGCM(key)
        decrypted_bytes = aesgcm.decrypt(nonce=iv, data=data_to_decrypt, associated_data=None)
        return decrypted_bytes.decode('utf-8')
    except InvalidTag:
        raise ValueError("Failed on encrypting the text...")