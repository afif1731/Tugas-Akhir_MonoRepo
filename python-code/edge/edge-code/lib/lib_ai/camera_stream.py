import cv2
import time
import logging
import threading

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [AI-SERVER] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger(__name__)

class CameraStream:
    def __init__(self, src, is_static_file=False):
        self.src = src
        self.is_static_file = is_static_file
        self.cap = cv2.VideoCapture(src)
        self.ret, self.frame = self.cap.read()
        self.running = True
        self.lock = threading.Lock()
        
        if not self.is_static_file:
            self.thread = threading.Thread(target=self.update, daemon=True)
            self.thread.start()

    def update(self):
        while self.running:
            if not self.cap.isOpened():
                time.sleep(0.1)
                continue
                
            ret, frame = self.cap.read()
            
            if not ret:
                if isinstance(self.src, str) and self.src.startswith("rtsp"):
                    logger.warning(f"RTSP Stream read failed. Reconnecting...")
                    self.cap.release()
                    time.sleep(2)
                    self.cap = cv2.VideoCapture(self.src)
                else:
                    time.sleep(0.1)
                continue
                
            # Filter completely gray or corrupt frames commonly found in H.265 RTSP streams
            if isinstance(self.src, str) and self.src.startswith("rtsp"):
                _, std = cv2.meanStdDev(frame)
                if std[0][0] < 5.0 and std[1][0] < 5.0 and std[2][0] < 5.0:
                    continue
                
            with self.lock:
                self.ret = ret
                self.frame = frame

    def read(self):
        if self.is_static_file:
            ret, frame = self.cap.read()
            if not ret:
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = self.cap.read()
            return ret, frame
        else:
            with self.lock:
                if not self.ret or self.frame is None:
                    return False, None
                return True, self.frame.copy()

    def isOpened(self):
        return self.running

    def release(self):
        self.running = False
        if not self.is_static_file and hasattr(self, 'thread') and self.thread.is_alive():
            self.thread.join(timeout=1.0)
        if self.cap:
            self.cap.release()