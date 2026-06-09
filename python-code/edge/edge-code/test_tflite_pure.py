import numpy as np
import tflite_runtime.interpreter as tflite
import sys

def test_model(model_path):
    print(f"Loading {model_path}...")
    interpreter = tflite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()
    
    input_details = interpreter.get_input_details()[0]
    output_details = interpreter.get_output_details()[0]
    
    print("INPUT DETAILS:")
    print(f"  Shape: {input_details['shape']}")
    print(f"  Dtype: {input_details['dtype']}")
    print(f"  Quant: {input_details['quantization']}")
    
    # 1. Test with purely zeros (like an empty padded buffer)
    data_zeros = np.zeros(input_details['shape'], dtype=np.float32)
    input_scale, input_zp = input_details['quantization']
    data_zeros_q = np.clip(np.round(data_zeros / input_scale + input_zp), -128, 127).astype(np.int8)
    
    interpreter.set_tensor(input_details['index'], data_zeros_q)
    interpreter.invoke()
    out_zeros = interpreter.get_tensor(output_details['index'])[0]
    print(f"\nOUT (All Zeros): raw={out_zeros}")
    
    # 2. Test with random noise (like untrained Colab test)
    data_rand = np.random.uniform(-300, 300, size=input_details['shape']).astype(np.float32)
    data_rand_q = np.clip(np.round(data_rand / input_scale + input_zp), -128, 127).astype(np.int8)
    
    interpreter.set_tensor(input_details['index'], data_rand_q)
    interpreter.invoke()
    out_rand = interpreter.get_tensor(output_details['index'])[0]
    print(f"OUT (Random -300..300): raw={out_rand}")

    # 3. Test with small noise (like normalized [0, 1] data)
    data_small = np.random.uniform(0, 1, size=input_details['shape']).astype(np.float32)
    data_small_q = np.clip(np.round(data_small / input_scale + input_zp), -128, 127).astype(np.int8)
    
    interpreter.set_tensor(input_details['index'], data_small_q)
    interpreter.invoke()
    out_small = interpreter.get_tensor(output_details['index'])[0]
    print(f"OUT (Random 0..1): raw={out_small}")

if __name__ == "__main__":
    test_model("lib/lib_ai/_model/GCN_LSTM_best_int8.tflite")
