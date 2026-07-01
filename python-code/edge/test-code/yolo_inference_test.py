import os
import sys
import time
import csv
import argparse
import logging
import cv2
import tflite_runtime.interpreter as tflite
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Add edge-code to sys.path so we can import from lib
base_dir = Path(__file__).resolve().parent
edge_code_dir = base_dir.parent / 'edge-code'
sys.path.append(str(edge_code_dir))

from lib.lib_ai.detector import yolo_pose_extraction

def load_interpreter(model_path, model_name):
    logger.info(f"Loading {model_name}...")
    try:
        delegate_lib = os.getenv('EDGETPU_SHARED_LIB', 'libedgetpu.so.1')
        delegate = tflite.load_delegate(delegate_lib)
        interpreter = tflite.Interpreter(model_path=str(model_path), experimental_delegates=[delegate], num_threads=4)
        interpreter.allocate_tensors()
        logger.info(f"Successfully loaded {model_name} with tflite_runtime delegate (Edge TPU).")
        return interpreter
    except Exception as e:
        logger.warning(f"Edge TPU delegate load failed for {model_name}: {e}. Falling back to CPU...")

    interpreter = tflite.Interpreter(model_path=str(model_path), num_threads=4)
    interpreter.allocate_tensors()
    logger.info(f"Successfully loaded {model_name} on CPU.")
    return interpreter

def run_inference(video_path, model_path, imgsz, result_dir):
    model_name = model_path.name
    logger.info(f"Testing model: {model_name} with imgsz={imgsz}")
    
    interpreter = load_interpreter(model_path, model_name)
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logger.error(f"Failed to open video: {video_path}")
        return None
        
    csv_filename = result_dir / f"{model_name}_imgsz{imgsz}_results.csv"
    
    frame_count = 0
    total_inference_time = 0.0
    total_human_detected = 0
    valid_frames = 0
    
    # Buka CSV dan tulis header
    with open(csv_filename, mode='w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['frame', 'inference', 'human_detected'])
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            frame_count += 1
            
            t0 = time.time()
            people = yolo_pose_extraction(
                yolo_interpreter=interpreter,
                frame=frame,
                conf_thresh=0.15,
                iou_thresh=0.45,
                imgsz=imgsz
            )
            inference_time = (time.time() - t0) * 1000 # in ms
            
            human_detected = len(people)
            
            writer.writerow([frame_count, inference_time, human_detected])
            
            total_inference_time += inference_time
            total_human_detected += human_detected
            valid_frames += 1
            
            if frame_count % 100 == 0:
                logger.info(f"[{model_name}] Processed {frame_count} frames...")
                
    cap.release()
    
    avg_inference = total_inference_time / valid_frames if valid_frames > 0 else 0
    avg_human = total_human_detected / valid_frames if valid_frames > 0 else 0
    
    logger.info(f"Finished testing {model_name}. Avg inference: {avg_inference:.2f} ms, Avg human: {avg_human:.2f}")
    
    return {
        'model_name': model_name,
        'imgsz': imgsz,
        'avg_inference': avg_inference,
        'avg_human': avg_human
    }

def main():
    parser = argparse.ArgumentParser(description="Test YOLO models on a video")
    parser.add_argument('--video', type=str, required=True, help="Path to the test video")
    parser.add_argument('--out_dir', type=str, default='_result', help="Output directory for results")
    args = parser.parse_args()
    
    video_path = args.video
    if not Path(video_path).exists():
        logger.error(f"Video file not found: {video_path}")
        return
        
    # Direktori output
    result_dir = base_dir / args.out_dir
    result_dir.mkdir(parents=True, exist_ok=True)
    
    model_base_dir = edge_code_dir / '_model'
    
    # Konfigurasi folder model yang akan diuji
    folders_to_test = [
        {'dir': model_base_dir / 'yolo_256', 'imgsz': 256},
        {'dir': model_base_dir / 'yolo_512', 'imgsz': 512}
    ]
    
    summary_results = []
    
    for folder_info in folders_to_test:
        model_dir = folder_info['dir']
        imgsz = folder_info['imgsz']
        
        if not model_dir.exists():
            logger.warning(f"Directory not found: {model_dir}")
            continue
            
        for model_file in model_dir.glob('*.tflite'):
            res = run_inference(video_path, model_file, imgsz, result_dir)
            if res:
                summary_results.append(res)
                
    # Tulis file summary txt
    if summary_results:
        summary_file = result_dir / 'summary.txt'
        with open(summary_file, 'w') as f:
            f.write("Kesimpulan Hasil Deteksi Model YOLO\n")
            f.write("==================================================\n")
            for res in summary_results:
                f.write(f"Dimensi Input         : {res['imgsz']}x{res['imgsz']}\n")
                f.write(f"Nama Model            : {res['model_name']}\n")
                f.write(f"Rata-rata Waktu Infer : {res['avg_inference']:.2f} ms\n")
                f.write(f"Rata-rata Manusia     : {res['avg_human']:.2f}\n")
                f.write("-" * 50 + "\n")
                
        logger.info(f"Summary written to {summary_file}")
    else:
        logger.warning("No models tested, no summary created.")

if __name__ == '__main__':
    main()
