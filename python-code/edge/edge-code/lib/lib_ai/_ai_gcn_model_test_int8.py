import numpy as np
import tensorflow as tf

tflite_model_path = 'path/to/int8_model/in/colab/GCN_LSTM_best_int8.tflite'

# Load TFLite model dan alokasikan tensor.
interpreter = tf.lite.Interpreter(model_path=tflite_model_path)
interpreter.allocate_tensors()

input_details = interpreter.get_input_details()[0]
output_details = interpreter.get_output_details()[0]

print(f"Input Type: {input_details['dtype']}")
print(f"Output Type: {output_details['dtype']}\n")

# Ambil 1 sampel dari test dataset
for x_test, y_test in test_dataset.unbatch().take(1):
    input_data = x_test.numpy()
    true_label = y_test.numpy()
    break

# Kuantisasi input secara manual sesuai dengan parameter model (karena input bertipe int8)
input_scale, input_zero_point = input_details['quantization']
if input_scale > 0:
    input_data_quantized = (input_data / input_scale + input_zero_point).astype(input_details['dtype'])
else:
    input_data_quantized = input_data.astype(input_details['dtype'])

# Jalankan Inference
interpreter.set_tensor(input_details['index'], input_data_quantized)
interpreter.invoke()

# Ambil output dan lakukan dekuantisasi
output_data_quantized = interpreter.get_tensor(output_details['index'])
output_scale, output_zero_point = output_details['quantization']

if output_scale > 0:
    output_data = (output_data_quantized.astype(np.float32) - output_zero_point) * output_scale
else:
    output_data = output_data_quantized

pred_label = np.argmax(output_data[0])

print(f"True Label  : {CLASSES[true_label]} ({true_label})")
print(f"Pred Label  : {CLASSES[pred_label]} ({pred_label})")
print(f"Output Prob : {output_data[0]}")