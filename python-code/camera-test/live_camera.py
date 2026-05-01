import cv2
import time

def cctv_simulator(source_path=None, resolution=(640, 480), fps=30):
    """
    Simulasi kamera CCTV. 
    Jika source_path kosong, akan menghasilkan 'test pattern'.
    """
    if source_path:
        cap = cv2.VideoCapture(source_path)
    else:
        # Gunakan webcam internal sebagai simulasi jika tidak ada file video
        cap = cv2.VideoCapture(0)

    print(f"Simulasi CCTV aktif pada {resolution[0]}x{resolution[1]} @ {fps} FPS")
    
    while cap.isOpened():
        start_time = time.time()
        ret, frame = cap.read()
        
        if not ret:
            # Loop video jika sudah habis
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        # Simulasi resolusi CCTV
        frame = cv2.resize(frame, resolution)

        # --- Tambahkan efek CCTV (Opsional) ---
        # 1. Tambahkan Noise (Grainy)
        # 2. Tambahkan Overlay Teks "CAM 01 - LIVE"
        cv2.putText(frame, f"CAM 01 - {time.strftime('%H:%M:%S')}", (20, 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        # Tampilkan hasil simulasi
        cv2.imshow('CCTV Simulator Output', frame)

        # Kontrol FPS agar stabil
        time_elapsed = time.time() - start_time
        time_to_wait = max(1, int((1/fps - time_elapsed) * 1000))
        
        if cv2.waitKey(time_to_wait) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

# cctv_simulator('video_kekerasan.mp4')
cctv_simulator() # Default ke webcam