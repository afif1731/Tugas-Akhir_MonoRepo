import torch
import numpy as np
from cv2.typing import MatLike
from collections import deque
from ultralytics import YOLO

import tflite_runtime.interpreter as tflite

def yolo_pose_extraction(yolo_model: YOLO, frame: MatLike, V: int, M: int):
  results = yolo_model.track(frame, persist=True, classes=[0], verbose=False)
  annotated_frame = results[0].plot(boxes=False)

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

def gcn_classification(CLASSES: list[str], gcn_interpreter: tflite.Interpreter, pose_buffer: deque, frame_count: int, T: int):
  if len(pose_buffer) == T and frame_count % 5 == 0:
    tensor_data = np.stack(pose_buffer, axis=1) # shape: (3, 100, 17, 3)
    input_tensor_float = np.expand_dims(tensor_data, axis=0).astype(np.float32) # shape: (1, 3, 100, 17, 3)

    input_details = gcn_interpreter.get_input_details()[0]
    output_details = gcn_interpreter.get_output_details()[0]

    input_scale, input_zp = input_details['quantization']
    
    if input_scale > 0:
        input_tensor_quantized = np.clip(np.round(input_tensor_float / input_scale + input_zp), -128, 127).astype(np.int8)
    else:
        input_tensor_quantized = input_tensor_float.astype(input_details['dtype'])

    gcn_interpreter.set_tensor(input_details['index'], input_tensor_quantized)
    gcn_interpreter.invoke()

    output_tensor_quantized = gcn_interpreter.get_tensor(output_details['index'])
    out_scale, out_zp = output_details['quantization']
    
    if out_scale > 0:
        probs = (output_tensor_quantized[0].astype(np.float32) - out_zp) * out_scale
    else:
        probs = output_tensor_quantized[0]
        
    class_idx = int(np.argmax(probs))
    current_label = CLASSES[class_idx]
    current_conf = float(probs[class_idx])
    
    return current_label, current_conf
  
  return None, None