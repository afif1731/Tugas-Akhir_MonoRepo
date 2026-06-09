import time
import cv2
import numpy as np
from collections import deque

import logging
logger = logging.getLogger(__name__)

import tflite_runtime.interpreter as tflite

def yolo_pose_extraction(yolo_interpreter: tflite.Interpreter, frame: np.ndarray, conf_thresh=0.25, iou_thresh=0.45):
    t0 = time.time()
    
    input_details = yolo_interpreter.get_input_details()[0]
    output_details = yolo_interpreter.get_output_details()[0]
    
    input_shape = input_details['shape']

    is_space_to_depth = False
    if len(input_shape) == 4:
        if input_shape[-1] == 12: # Deteksi model EdgeTPU dengan Space-to-Depth 2x2
            input_height, input_width = input_shape[1] * 2, input_shape[2] * 2
            is_space_to_depth = True
        elif input_shape[1] == 3: # NCHW
            input_height, input_width = input_shape[2], input_shape[3]
        else: # NHWC standar
            input_height, input_width = input_shape[1], input_shape[2]
    else:
        input_height, input_width = 512, 512
        
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
        factor = 1.0 / (255.0 * input_scale)
        if input_details['dtype'] == np.int8:
            input_data = img_rgb.astype(np.float32)
            input_data *= factor
            input_data += input_zp
            np.round(input_data, out=input_data)
            input_data = np.clip(input_data, -128, 127).astype(np.int8)
        else:
            input_data = img_rgb.astype(np.float32)
            input_data *= factor
            input_data += input_zp
            np.round(input_data, out=input_data)
            input_data = np.clip(input_data, 0, 255).astype(np.uint8)
    else:
        input_data = (img_rgb / 255.0).astype(np.float32)
        
    input_data = np.expand_dims(input_data, axis=0)
    
    if is_space_to_depth:
        b, h, w, c = input_data.shape
        # Mengubah dari (1, 512, 512, 3) menjadi (1, 256, 256, 12)
        input_data = input_data.reshape(b, h // 2, 2, w // 2, 2, c)
        input_data = input_data.transpose(0, 1, 3, 2, 4, 5)
        input_data = input_data.reshape(b, h // 2, w // 2, c * 4)
    elif len(input_shape) == 4 and input_shape[1] == 3:
        input_data = np.transpose(input_data, (0, 3, 1, 2))
            
    yolo_interpreter.set_tensor(input_details['index'], input_data)
    
    t1 = time.time()
    yolo_interpreter.invoke()
    t2 = time.time()
    
    output_data = yolo_interpreter.get_tensor(output_details['index'])
    
    out_scale, out_zp = output_details['quantization']
    if out_scale > 0:
        quantized_thresh = int(round((conf_thresh / out_scale) + out_zp))
        
        if len(output_data.shape) == 3 and output_data.shape[1] == 56:
            preds_int8 = output_data[0] # shape (56, 5376)
            scores_int8 = preds_int8[4, :]
            valid_idx = scores_int8 > quantized_thresh
            
            filtered_preds_int8 = preds_int8[:, valid_idx].T
            preds = (filtered_preds_int8.astype(np.float32) - out_zp) * out_scale
        else:
            preds_int8 = output_data[0].T if output_data.shape[1] < output_data.shape[2] else output_data[0]
            scores_int8 = preds_int8[:, 4]
            valid_idx = scores_int8 > quantized_thresh
            
            filtered_preds_int8 = preds_int8[valid_idx]
            preds = (filtered_preds_int8.astype(np.float32) - out_zp) * out_scale
            
        scores = preds[:, 4]
    else:
        if len(output_data.shape) == 3 and output_data.shape[1] == 56:
            preds = output_data[0].T
        else:
            preds = output_data[0].T if output_data.shape[1] < output_data.shape[2] else output_data[0]
            
        raw_scores = preds[:, 4]
        valid_idx = raw_scores > conf_thresh
        preds = preds[valid_idx]
        scores = preds[:, 4]
    
    boxes = preds[:, :4]
    x = boxes[:, 0] * input_width
    y = boxes[:, 1] * input_height
    w = boxes[:, 2] * input_width
    h = boxes[:, 3] * input_height
    
    x = (x - dw) / r
    y = (y - dh) / r
    w = w / r
    h = h / r
    
    x1 = x - w / 2
    y1 = y - h / 2
    
    people = []
    
    if len(x1) > 0:
        x2 = x1 + w
        y2 = y1 + h
        areas = w * h
        order = scores.argsort()[::-1]
        
        keep = []
        while order.size > 0:
            i = order[0]
            keep.append(i)
            if order.size == 1:
                break
                
            xx1 = np.maximum(x1[i], x1[order[1:]])
            yy1 = np.maximum(y1[i], y1[order[1:]])
            xx2 = np.minimum(x2[i], x2[order[1:]])
            yy2 = np.minimum(y2[i], y2[order[1:]])
            
            w_inter = np.maximum(0.0, xx2 - xx1)
            h_inter = np.maximum(0.0, yy2 - yy1)
            inter = w_inter * h_inter
            
            ovr = inter / (areas[i] + areas[order[1:]] - inter)
            inds = np.where(ovr <= iou_thresh)[0]
            order = order[inds + 1]
            
        sorted_indices = keep
        
        for idx in sorted_indices:
            kpts = preds[idx, 5:56].reshape((17, 3))
            kpts[:, 0] = (kpts[:, 0] * input_width - dw) / r
            kpts[:, 1] = (kpts[:, 1] * input_height - dh) / r
            
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

    t3 = time.time()
    if np.random.rand() < 0.1:
        logger.info(f"YOLO INTERNAL (ms) - Pre: {(t1-t0)*1000:.1f} | EdgeTPU: {(t2-t1)*1000:.1f} | Post: {(t3-t2)*1000:.1f}")

    return people

def gcn_classification(CLASSES: list, gcn_interpreter: tflite.Interpreter, pose_buffer: deque, frame_count: int, T: int):
    if len(pose_buffer) == T and frame_count % 5 == 0:
        tensor_data = np.stack(pose_buffer, axis=1) # shape: (C, T, V, M)

        input_details = gcn_interpreter.get_input_details()[0]
        output_details = gcn_interpreter.get_output_details()[0]
        
        expected_shape = input_details['shape']
        if len(expected_shape) == 4:
            input_tensor_float = tensor_data.astype(np.float32)
        else:
            input_tensor_float = np.expand_dims(tensor_data, axis=0).astype(np.float32)

        input_scale, input_zp = input_details['quantization']
        
        if input_scale > 0:
            input_tensor_quantized = np.clip(np.round(input_tensor_float / input_scale + input_zp), -128, 127).astype(np.int8)
        else:
            input_tensor_quantized = input_tensor_float.astype(input_details['dtype'])

        logger.info(f"GCN INT8 IN: min={np.min(input_tensor_quantized)}, max={np.max(input_tensor_quantized)}, mean={np.mean(input_tensor_quantized):.2f}, scale={input_scale:.4f}, zp={input_zp}")
        
        gcn_interpreter.set_tensor(input_details['index'], input_tensor_quantized)
        gcn_interpreter.invoke()

        output_tensor_quantized = gcn_interpreter.get_tensor(output_details['index'])
        out_scale, out_zp = output_details['quantization']
        
        logger.info(f"GCN INT8 OUT: raw={output_tensor_quantized[0]}, scale={out_scale:.4f}, zp={out_zp}")
        
        if out_scale > 0:
            probs = (output_tensor_quantized[0].astype(np.float32) - out_zp) * out_scale
        else:
            probs = output_tensor_quantized[0]
            
        class_idx = int(np.argmax(probs))
        current_label = CLASSES[class_idx]
        current_conf = float(probs[class_idx])
        
        all_conf = {CLASSES[i]: float(probs[i]) for i in range(len(CLASSES))}
        
        return current_label, current_conf, all_conf
    
    return None, None, None