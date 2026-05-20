import cv2
import numpy as np
from collections import deque

import tflite_runtime.interpreter as tflite

def yolo_pose_extraction(yolo_interpreter: tflite.Interpreter, frame: np.ndarray, conf_thresh=0.25, iou_thresh=0.45):
    input_details = yolo_interpreter.get_input_details()[0]
    output_details = yolo_interpreter.get_output_details()[0]
    
    input_shape = input_details['shape']
    if len(input_shape) == 4:
        if input_shape[1] == 3:
            input_height, input_width = input_shape[2], input_shape[3]
        else:
            input_height, input_width = input_shape[1], input_shape[2]
    else:
        input_height, input_width = 640, 640
        
    shape = frame.shape[:2]
    r = min(input_height / shape[0], input_width / shape[1])
    new_unpad = int(round(shape[1] * r)), int(round(shape[0] * r))
    dw, dh = input_width - new_unpad[0], input_height - new_unpad[1]
    dw /= 2
    dh /= 2
    
    img = cv2.resize(frame, new_unpad, interpolation=cv2.INTER_LINEAR)
    top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
    left, right = int(round(dw - 0.1)), int(round(dw + 0.1))
    img = cv2.copyMakeBorder(img, top, bottom, left, right, cv2.BORDER_CONSTANT, value=(114, 114, 114))
    
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    input_scale, input_zp = input_details['quantization']
    if input_scale > 0:
        if input_details['dtype'] == np.int8:
                input_data = (img_rgb / 255.0) / input_scale + input_zp
                input_data = np.clip(np.round(input_data), -128, 127).astype(np.int8)
        else:
                input_data = (img_rgb / 255.0) / input_scale + input_zp
                input_data = np.clip(np.round(input_data), 0, 255).astype(np.uint8)
    else:
        input_data = (img_rgb / 255.0).astype(np.float32)
        
    input_data = np.expand_dims(input_data, axis=0)
    if len(input_shape) == 4 and input_shape[1] == 3:
            input_data = np.transpose(input_data, (0, 3, 1, 2))
            
    yolo_interpreter.set_tensor(input_details['index'], input_data)
    yolo_interpreter.invoke()
    output_data = yolo_interpreter.get_tensor(output_details['index'])
    
    out_scale, out_zp = output_details['quantization']
    if out_scale > 0:
        output_data = (output_data.astype(np.float32) - out_zp) * out_scale
        
    if len(output_data.shape) == 3 and output_data.shape[1] == 56:
            preds = output_data[0].T
    else:
            preds = output_data[0].T if output_data.shape[1] < output_data.shape[2] else output_data[0]
            
    scores = preds[:, 4]
    valid_idx = scores > conf_thresh
    preds = preds[valid_idx]
    
    boxes = preds[:, :4]
    x = boxes[:, 0]
    y = boxes[:, 1]
    w = boxes[:, 2]
    h = boxes[:, 3]
    
    x = (x - dw) / r
    y = (y - dh) / r
    w = w / r
    h = h / r
    
    x1 = x - w / 2
    y1 = y - h / 2
    
    boxes_nms = [[float(x1[i]), float(y1[i]), float(w[i]), float(h[i])] for i in range(len(x1))]
    scores_nms = [float(s) for s in preds[:, 4]]
    
    indices = cv2.dnn.NMSBoxes(boxes_nms, scores_nms, conf_thresh, iou_thresh)
    
    people = []
    
    if len(indices) > 0:
        indices = indices.flatten()
        sorted_indices = sorted(indices, key=lambda i: scores_nms[i], reverse=True)
        
        for idx in sorted_indices:
            kpts = preds[idx, 5:].reshape((17, 3))
            kpts[:, 0] = (kpts[:, 0] - dw) / r
            kpts[:, 1] = (kpts[:, 1] - dh) / r
            
            hip_l, hip_r = kpts[11], kpts[12]
            
            if hip_l[2] > 0.5 and hip_r[2] > 0.5:
                pelvis_x = float((hip_l[0] + hip_r[0]) / 2)
                pelvis_y = float((hip_l[1] + hip_r[1]) / 2)
                
                relative_kpts = np.zeros((3, 17))
                for v in range(17):
                    if kpts[v][2] > 0.5:
                        relative_kpts[0, v] = kpts[v][0] - pelvis_x
                        relative_kpts[1, v] = kpts[v][1] - pelvis_y
                        relative_kpts[2, v] = kpts[v][2]
                        
                people.append({
                    "box": [float(x1[idx]), float(y1[idx]), float(w[idx]), float(h[idx])],
                    "keypoints": kpts.tolist(),
                    "pelvis": [pelvis_x, pelvis_y],
                    "relative_kpts": relative_kpts
                })

    return people

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