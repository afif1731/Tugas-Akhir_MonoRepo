import os
import sys
import time
import argparse
import logging
import cv2
import numpy as np
import multiprocessing
from pathlib import Path
from collections import deque

# Setup path agar bisa import lib dari edge-code
base_dir = Path(__file__).resolve().parent
edge_code_dir = base_dir.parent / 'edge-code'
if str(edge_code_dir) not in sys.path:
    sys.path.append(str(edge_code_dir))

from lib.lib_ai.detector import yolo_pose_extraction, gnn_classification
from lib.lib_ai.crowd_cluster import CentroidTracker, spatial_clustering
import tflite_runtime.interpreter as tflite

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
    direct = model_dir / model_name
    if direct.exists():
        return direct
    for p in model_dir.rglob(model_name):
        return p
    return None

def run_camera_worker(video_path, yolo_path, bb_path, head_path, num_cams, vid_idx, out_dir):
    """
    Fungsi worker yang dijalankan sebagai sub-proses.
    Mensimulasikan beban pemrosesan satu kamera secara mandiri.
    """
    logger = logging.getLogger(f"Worker-{vid_idx}")
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        ch = logging.StreamHandler()
        ch.setFormatter(logging.Formatter('%(asctime)s [%(name)s] [%(levelname)s] %(message)s', datefmt='%H:%M:%S'))
        logger.addHandler(ch)

    logger.info(f"Starting test for video {vid_idx} ({video_path})")

    # Load interpreters inside worker to ensure independent context for each process
    def load_interp(path, name):
        try:
            delegate_lib = os.getenv('EDGETPU_SHARED_LIB', 'libedgetpu.so.1')
            delegate = tflite.load_delegate(delegate_lib)
            interp = tflite.Interpreter(model_path=str(path), experimental_delegates=[delegate], num_threads=4)
            interp.allocate_tensors()
            return interp
        except Exception as e:
            logger.warning(f"Failed to load EdgeTPU for {name}, falling back to CPU. Error: {e}")

        path_obj = Path(path)
        if "_edgetpu" in path_obj.name:
            fallback_name = path_obj.name.replace("_edgetpu", "")
            fallback_path = path_obj.parent / fallback_name
            if fallback_path.exists():
                path = fallback_path
                logger.info(f"Found non-EdgeTPU model, using: {path_obj.name}")
            else:
                logger.warning(f"Non-EdgeTPU model '{fallback_name}' not found. Trying to run EdgeTPU model on CPU...")

        interp = tflite.Interpreter(model_path=str(path), num_threads=4)
        interp.allocate_tensors()
        return interp

    yolo_interpreter = load_interp(yolo_path, "YOLO")
    bb_interpreter = load_interp(bb_path, "Backbone")
    head_interpreter = load_interp(head_path, "Head")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logger.error(f"Cannot open video {video_path}")
        return

    FRAME_SIZE = 640
    YOLO_IMGSZ = 256
    T_FRAMES = 100
    V_JOINTS = 17
    M_PEOPLE = 3
    CLASSES = ['assault', 'fighting', 'shooting', 'robbery', 'normal_event']

    tracker = CentroidTracker(max_disappeared=200, max_distance=300)
    individual_tracker = CentroidTracker(max_disappeared=30, max_distance=150)
    
    cluster_buffers = {}
    cluster_slot_assignment = {}
    frame_count = 0

    # Menyimpan durasi setiap langkah pemrosesan
    read_times = []
    resize_times = []
    yolo_times = []
    gcn_times = []

    has_run_gcn = False

    while True:
        # 1. Frame Reading
        t_start = time.time()
        ret, frame = cap.read()
        t_read = time.time()
        
        if not ret:
            if has_run_gcn:
                break
            else:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                individual_tracker.max_distance = 10000
                tracker.max_distance = 10000
                t_start = time.time()
                ret, frame = cap.read()
                t_read = time.time()
                if not ret:
                    break
            
        read_times.append((t_read - t_start) * 1000)
        
        # 2. Frame Preprocessing (Resize)
        frame = cv2.resize(frame, (FRAME_SIZE, FRAME_SIZE))
        t_resize = time.time()
        resize_times.append((t_resize - t_read) * 1000)
        
        # 3. YOLO Inference (Mencakup Ekstraksi Pose lengkap)
        people = yolo_pose_extraction(
            yolo_interpreter=yolo_interpreter,
            frame=frame,
            conf_thresh=0.15,
            iou_thresh=0.45,
            imgsz=YOLO_IMGSZ
        )
        t_yolo = time.time()
        yolo_times.append((t_yolo - t_resize) * 1000)
        
        # Tracker & Cluster Updates
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
        
        if tracker.max_distance == 10000:
            tracker.max_distance = 300
            individual_tracker.max_distance = 150
            
        active_ind_ids = set(individual_tracker.objects.keys())
        
        frame_gcn_time = 0.0
        gcn_ran = False

        # 4. GCN Prep & Inference
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
                        for temp_m in range(M_PEOPLE):
                            if temp_m != m:
                                frame_pose_data[:, :, temp_m] = person["relative_kpts"]
                                
            cluster_buffers[object_id].append(frame_pose_data)
            
            t_gcn_start = time.time()
            lbl, conf, all_conf = gnn_classification(
                CLASSES,
                bb_interpreter,
                head_interpreter,
                cluster_buffers[object_id],
                frame_count,
                T_FRAMES
            )
            t_gcn_end = time.time()

            # GCN hanya di-invoke pada kondisi tertentu (buffer penuh & modulo frame).
            if lbl is not None:
                has_run_gcn = True
                gcn_ran = True
                
                # Lakukan GNN ke-dua pada data yang sama
                t_gcn_start_2 = time.time()
                gnn_classification(
                    CLASSES,
                    bb_interpreter,
                    head_interpreter,
                    cluster_buffers[object_id],
                    frame_count,
                    T_FRAMES
                )
                t_gcn_end_2 = time.time()
                
                # Waktu eksekusi rata-rata dari kedua pemanggilan (dalam ms)
                frame_gcn_time += ((t_gcn_end - t_gcn_start) + (t_gcn_end_2 - t_gcn_start_2)) / 2.0 * 1000
            
        if gcn_ran:
            gcn_times.append(frame_gcn_time)

        # Cleanup memory
        active_object_ids = set(tracked.values())
        for obj_id in list(cluster_buffers.keys()):
            if obj_id not in active_object_ids and obj_id not in tracker.objects:
                del cluster_buffers[obj_id]
                if obj_id in cluster_slot_assignment:
                    del cluster_slot_assignment[obj_id]
                    
        frame_count += 1
        if frame_count % 100 == 0:
            logger.info(f"Processed {frame_count} frames...")
            
        if has_run_gcn:
            logger.info(f"GCN successfully ran on frame {frame_count}. Stopping test.")
            break
            
    cap.release()

    # Hitung Rata-rata
    avg_read = sum(read_times) / len(read_times) if read_times else 0
    avg_resize = sum(resize_times) / len(resize_times) if resize_times else 0
    avg_yolo = sum(yolo_times) / len(yolo_times) if yolo_times else 0
    avg_gcn = sum(gcn_times) / len(gcn_times) if gcn_times else 0

    # Laporan disimpan ke format: cam_test_report_{i}cam_vid{j}.txt
    report_name = f"cam_test_report_{num_cams}cam_vid{vid_idx}.txt"
    report_path = out_dir / report_name

    with open(report_path, 'w') as f:
        f.write(f"Multi-Camera Test Report\n")
        f.write(f"========================================\n")
        f.write(f"Total Cameras Running : {num_cams}\n")
        f.write(f"Camera Index          : {vid_idx}\n")
        f.write(f"Video Source          : {video_path}\n")
        f.write(f"Total Frames Processed: {frame_count}\n")
        f.write(f"----------------------------------------\n")
        f.write(f"Rata-rata Waktu (ms)\n")
        f.write(f"Frame Reading         : {avg_read:.3f} ms\n")
        f.write(f"Frame Preprocessing   : {avg_resize:.3f} ms\n")
        f.write(f"YOLO Inference        : {avg_yolo:.3f} ms\n")
        f.write(f"GCN Inference         : {avg_gcn:.3f} ms\n")
        f.write(f"========================================\n")

    logger.info(f"Finished. Report saved to {report_name}")


def main():
    parser = argparse.ArgumentParser(description="Multi-camera stress test for Edge Device")
    parser.add_argument('--video1', type=str, help="Path for first video stream")
    parser.add_argument('--video2', type=str, help="Path for second video stream")
    parser.add_argument('--video3', type=str, help="Path for third video stream")
    parser.add_argument('--out_dir', type=str, default='_result', help="Output directory")
    args = parser.parse_args()

    videos = []
    if args.video1: videos.append(args.video1)
    if args.video2: videos.append(args.video2)
    if args.video3: videos.append(args.video3)

    if not videos:
        print("Mohon sediakan setidaknya satu argumen video (contoh: --video1 nama_video.mp4)")
        return

    num_cams = len(videos)

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
        print("Gagal menemukan model YOLO, Backbone, atau Head di folder _model.")
        return

    out_dir = base_dir / args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Memulai pengujian {num_cams} kamera secara paralel...")

    processes = []
    for idx, vid in enumerate(videos, start=1):
        p = multiprocessing.Process(
            target=run_camera_worker,
            args=(vid, yolo_path, bb_path, head_path, num_cams, idx, out_dir)
        )
        processes.append(p)

    # Start all parallel processes
    for p in processes:
        p.start()

    # Tunggu semua proses selesai
    for p in processes:
        p.join()

    print(f"Semua tes dari {num_cams} kamera telah selesai. Cek laporan di folder {args.out_dir}/")

if __name__ == '__main__':
    # Fix untuk multiprocessing di Windows
    multiprocessing.freeze_support()
    main()
