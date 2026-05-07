import torch
import numpy as np
from cv2.typing import MatLike
from collections import deque
from ultralytics import YOLO

from lib.gcn_model import GCN_LSTM, device, A

def yolo_pose_extraction(yolo_model: YOLO, frame: MatLike, V: int, M: int):
  results = yolo_model.track(frame, persist=True, classes=[0], verbose=False)
  annotated_frame = results[0].plot()

  frame_pose_data = np.zeros((3, V, M))
  keypoints_obj = results[0].keypoints

  if keypoints_obj is not None and keypoints_obj.data is not None:
    kpts_raw = keypoints_obj.data
    
    if isinstance(kpts_raw, torch.Tensor):
      kpts = kpts_raw.cpu().numpy()
    else:
      kpts = kpts_raw
    
    if kpts.size > 0:
      num_people = min(len(kpts), M)
      
      for m in range(num_people):
        person_kpts = kpts[m]
        if len(person_kpts) >= 17:
          hip_l, hip_r = person_kpts[11], person_kpts[12]
          
          if hip_l[2] > 0 and hip_r[2] > 0:
            pelvis_x = (hip_l[0] + hip_r[0]) / 2
            pelvis_y = (hip_l[1] + hip_r[1]) / 2
            for v in range(V):
              if person_kpts[v][2] > 0:
                frame_pose_data[0, v, m] = person_kpts[v][0] - pelvis_x
                frame_pose_data[1, v, m] = person_kpts[v][1] - pelvis_y
                frame_pose_data[2, v, m] = person_kpts[v][2]
  
  return frame_pose_data, annotated_frame

def gcn_classification(CLASSES: list[str], gcn_model: GCN_LSTM, pose_buffer: deque, frame_count: int, T: int):
  if len(pose_buffer) == T and frame_count % 5 == 0:
    tensor_data = np.stack(pose_buffer, axis=1) 
    tensor_data = np.max(tensor_data, axis=-1)  
    
    input_tensor = torch.tensor(tensor_data, dtype=torch.float32).unsqueeze(0).to(device)
    with torch.no_grad():
      output = gcn_model(input_tensor, A)
      probs = torch.softmax(output, dim=1)[0]
      class_idx = torch.argmax(probs).item()
      current_label = CLASSES[int(class_idx)]
      current_conf = probs[int(class_idx)].item()
      return current_label, current_conf
    
  return None, None