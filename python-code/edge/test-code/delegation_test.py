import os
import sys
import time
import csv
import argparse
import logging
import cv2
import numpy as np
from pathlib import Path
from collections import deque
from types import MethodType

import tflite_runtime.interpreter as tflite

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Tambahkan path edge-code agar bisa import module lib
base_dir = Path(__file__).resolve().parent
edge_code_dir = base_dir.parent / 'edge-code'
sys.path.append(str(edge_code_dir))

from lib.lib_ai.detector import yolo_pose_extraction, gnn_classification
from lib.lib_ai.crowd_cluster import CentroidTracker, spatial_clustering

def parse_env(env_path):
    config = {}
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    k, v = line.split('=', 1)
                    config[k.strip()] = v.strip().strip('"').strip("'")
    return config

def find_model(model_dir, model_name):
    # Cek langsung
    direct = model_dir / model_name
    if direct.exists():
        return direct
    # Cari di subfolder jika tidak ada
    for p in model_dir.rglob(model_name):
        return p
    return None

def load_interpreter(model_path, model_name, delegation):
    logger.info(f"Loading {model_name} with {delegation['name']}...")
    if delegation['use_delegate']:
        try:
            delegate_lib = os.getenv('EDGETPU_SHARED_LIB', 'libedgetpu.so.1')
            delegate = tflite.load_delegate(delegate_lib)
            interpreter = tflite.Interpreter(
                model_path=str(model_path), 
                experimental_delegates=[delegate], 
                num_threads=delegation['num_threads']
            )
            interpreter.allocate_tensors()
            return interpreter
        except Exception as e:
            logger.warning(f"Failed to load EdgeTPU for {model_name}: {e}")
            return None # Skip jika TPU tidak tersedia

    interpreter = tflite.Interpreter(
        model_path=str(model_path), 
        num_threads=delegation['num_threads']
    )
    interpreter.allocate_tensors()
    return interpreter

def attach_time_tracker(interpreter, timings_list):
    """
    Monkey-patch metode `invoke` dari interpreter untuk menghitung
    waktu eksekusi murni dan menyimpannya ke dalam `timings_list`.
    """
    original_invoke = interpreter.invoke
    def patched_invoke(self):
        t0 = time.time()
        res = original_invoke()
        timings_list.append((time.time() - t0) * 1000) # dalam milidetik (ms)
        return res
    interpreter.invoke = MethodType(patched_invoke, interpreter)

def run_pipeline(video_path, yolo_path, bb_path, head_path, delegation, out_dir):
    yolo_interpreter = load_interpreter(yolo_path, "YOLO", delegation)
    bb_interpreter = load_interpreter(bb_path, "Backbone", delegation)
    head_interpreter = load_interpreter(head_path, "Head", delegation)

    if not yolo_interpreter or not bb_interpreter or not head_interpreter:
        logger.error(f"Skipping {delegation['name']} due to model load failure.")
        return None

    all_yolo_times = []
    all_bb_times = []
    all_head_times = []

    yolo_times = []
    bb_times = []
    head_times = []

    attach_time_tracker(yolo_interpreter, yolo_times)
    attach_time_tracker(bb_interpreter, bb_times)
    attach_time_tracker(head_interpreter, head_times)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logger.error(f"Cannot open video {video_path}")
        return None

    # Konstanta untuk simulasi proses keseluruhan
    FRAME_SIZE = 640
    YOLO_IMGSZ = 256
    T_FRAMES = 30
    V_JOINTS = 17
    M_PEOPLE = 5
    CLASSES = [f"Class_{i}" for i in range(20)] # Dummy kelas

    tracker = CentroidTracker(max_disappeared=200, max_distance=300)
    individual_tracker = CentroidTracker(max_disappeared=30, max_distance=150)
    
    cluster_buffers = {}
    cluster_slot_assignment = {}
    frame_count = 0
    
    logger.info(f"Starting pipeline inference for {delegation['name']}...")
    
    csv_path = out_dir / f"delegation_{delegation['name']}_results.csv"
    csv_file = open(csv_path, 'w', newline='')
    csv_writer = csv.writer(csv_file)
    csv_writer.writerow(['frame', 'yolo_inference', 'backbone_inference', 'head_inference'])
    
    while cap.isOpened():
        yolo_times.clear()
        bb_times.clear()
        head_times.clear()

        ret, frame = cap.read()
        if not ret:
            break
            
        frame = cv2.resize(frame, (FRAME_SIZE, FRAME_SIZE))
        
        # 1. YOLO Inference
        people = yolo_pose_extraction(
            yolo_interpreter=yolo_interpreter,
            frame=frame,
            conf_thresh=0.15,
            iou_thresh=0.45,
            imgsz=YOLO_IMGSZ
        )
        
        # 2. Tracking & Clustering
        all_pelvis = [p["pelvis"] for p in people]
        tracked_individuals = individual_tracker.update(all_pelvis)
        for idx, person in enumerate(people):
            person["individual_id"] = tracked_individuals.get(idx, -1)
            
        clusters = spatial_clustering(people=people, max_distance=200)
        cluster_centroids = []
        for cluster in clusters:
            cx = sum(p["pelvis"][0] for p in cluster) / len(cluster)
            cy = sum(p["pelvis"][1] for p in cluster) / len(cluster)
            cluster_centroids.append([cx, cy])
            
        tracked = tracker.update(cluster_centroids)
        active_ind_ids = set(individual_tracker.objects.keys())
        
        # 3. GNN Prep & Inference
        for cluster_idx, object_id in tracked.items():
            if object_id not in cluster_buffers:
                cluster_buffers[object_id] = deque(maxlen=T_FRAMES)
                cluster_slot_assignment[object_id] = {}
                
            cluster_people = clusters[cluster_idx]
            slot_assignment = cluster_slot_assignment[object_id]
            
            for ind_id in list(slot_assignment.keys()):
                if ind_id not in active_ind_ids:
                    del slot_assignment[ind_id]
                    
            used_slots = set(slot_assignment.values())
            for person in cluster_people:
                ind_id = person["individual_id"]
                if ind_id == -1: continue
                if ind_id not in slot_assignment:
                    for slot in range(M_PEOPLE):
                        if slot not in used_slots:
                            slot_assignment[ind_id] = slot
                            used_slots.add(slot)
                            break
                            
            frame_pose_data = np.zeros((3, V_JOINTS, M_PEOPLE))
            for person in cluster_people:
                ind_id = person["individual_id"]
                if ind_id in slot_assignment:
                    m = slot_assignment[ind_id]
                    if m < M_PEOPLE:
                        frame_pose_data[:, :, m] = person["relative_kpts"]
                        # Duplikat mengisi slot kosong agar input valid seperti ai_server.py
                        for temp_m in range(M_PEOPLE):
                            if temp_m != m:
                                frame_pose_data[:, :, temp_m] = person["relative_kpts"]
                                
            cluster_buffers[object_id].append(frame_pose_data)
            
            # Memanggil GNN Classification, yang internalnya memanggil bb_interpreter & head_interpreter
            gnn_classification(
                CLASSES,
                bb_interpreter,
                head_interpreter,
                cluster_buffers[object_id],
                frame_count,
                T_FRAMES
            )
            
        # 4. Cleanup memory
        active_object_ids = set(tracked.values())
        for obj_id in list(cluster_buffers.keys()):
            if obj_id not in active_object_ids and obj_id not in tracker.objects:
                del cluster_buffers[obj_id]
                if obj_id in cluster_slot_assignment:
                    del cluster_slot_assignment[obj_id]
                    
        current_yolo = sum(yolo_times) if yolo_times else 0.0
        current_bb = sum(bb_times) if bb_times else 0.0
        current_head = sum(head_times) if head_times else 0.0
        
        csv_writer.writerow([frame_count + 1, current_yolo, current_bb, current_head])
        
        all_yolo_times.extend(yolo_times)
        all_bb_times.extend(bb_times)
        all_head_times.extend(head_times)
                    
        frame_count += 1
        if frame_count % 50 == 0:
            logger.info(f"[{delegation['name']}] Processed {frame_count} frames...")
            
    cap.release()
    csv_file.close()
    
    # Hitung Rata-rata
    avg_yolo = sum(all_yolo_times) / len(all_yolo_times) if all_yolo_times else 0
    avg_bb = sum(all_bb_times) / len(all_bb_times) if all_bb_times else 0
    avg_head = sum(all_head_times) / len(all_head_times) if all_head_times else 0
    
    logger.info(f"Finished {delegation['name']}. Avg YOLO: {avg_yolo:.2f}ms, BB: {avg_bb:.2f}ms, Head: {avg_head:.2f}ms")
    
    return {
        "delegation": delegation["name"],
        "avg_yolo": avg_yolo,
        "avg_bb": avg_bb,
        "avg_head": avg_head,
        "frames": frame_count
    }

def main():
    parser = argparse.ArgumentParser(description="Test Delegation Performance (TPU vs CPU vs CPU 4-threads)")
    parser.add_argument('--video', type=str, required=True, help="Path to video")
    parser.add_argument('--out_dir', type=str, default='_result', help="Output dir")
    args = parser.parse_args()
    
    # Baca model dari .env
    env_path = edge_code_dir / '.env'
    config = parse_env(env_path)
    
    yolo_file = config.get('YOLO_FILE', 'yolov8n-pose_full_integer_quant_edgetpu.tflite')
    bb_file = config.get('GNN_BACKBONE_FILE', 'GNN_TCN_backbone_best_int8_edgetpu.tflite')
    head_file = config.get('GNN_HEAD_FILE', 'GNN_TCN_head_best_int8.tflite')
    
    model_dir = edge_code_dir / '_model'
    yolo_path = find_model(model_dir, yolo_file)
    bb_path = find_model(model_dir, bb_file)
    head_path = find_model(model_dir, head_file)
    
    if not yolo_path or not bb_path or not head_path:
        logger.error("Could not find one or more required models in _model directory.")
        logger.error(f"YOLO Path: {yolo_path} (from {yolo_file})")
        logger.error(f"Backbone Path: {bb_path} (from {bb_file})")
        logger.error(f"Head Path: {head_path} (from {head_file})")
        return
        
    delegations = [
        {"name": "TPU", "use_delegate": True, "num_threads": 1},
        {"name": "CPU_1_Thread", "use_delegate": False, "num_threads": 1},
        {"name": "CPU_4_Threads", "use_delegate": False, "num_threads": 4},
    ]
    
    result_dir = base_dir / args.out_dir
    result_dir.mkdir(parents=True, exist_ok=True)

    results = []
    
    for dele in delegations:
        res = run_pipeline(args.video, yolo_path, bb_path, head_path, dele, result_dir)
        if res:
            results.append(res)
            
    # Tulis hasil summary txt
    summary_path = result_dir / 'delegation_summary.txt'
    if results:
        with open(summary_path, 'w') as f:
            f.write("Hasil Pengujian Delegasi (Rata-rata Waktu Inferensi murni dalam ms)\n")
            f.write("==============================================================\n")
            f.write(f"YOLO Model    : {yolo_file}\n")
            f.write(f"Backbone Model: {bb_file}\n")
            f.write(f"Head Model    : {head_file}\n")
            f.write("--------------------------------------------------------------\n")
            for r in results:
                f.write(f"Delegasi           : {r['delegation']}\n")
                f.write(f"Total Frame Proses : {r['frames']}\n")
                f.write(f"Rata-rata YOLO     : {r['avg_yolo']:.3f} ms\n")
                f.write(f"Rata-rata Backbone : {r['avg_bb']:.3f} ms\n")
                f.write(f"Rata-rata Head     : {r['avg_head']:.3f} ms\n")
                f.write("--------------------------------------------------------------\n")
                
        logger.info(f"Testing finished. Summary written to {summary_path}")
    else:
        logger.warning("No results to save.")

if __name__ == '__main__':
    main()
