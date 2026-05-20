# Python Code for Edge Device and Other Stuff

### To Run Violence Detector Test

This code is now can only run in Edge Device with TPU environment

**Important Note:** There is a possibility that your coral dev board has different runtime version than the required (v14, not v13).

if you get an error like the one below

```cmd
Failed precondition: Package requires runtime version (14), which is newer than this runtime version (13).Node number 185 (EdgeTpuDelegateForCustomOp) failed to prepare.
```

try to update the `libedgetpu1` first

```shell
sudo apt-get update

sudo apt-get install libedgetpu1-max
```

1. Install `uv`

2. When you're running the code in Google Coral Device and you have sdcard mounted, make sure to change the uv cache to your sdcard to make sure your device didn't running out of memory

```shell
# Assuming your sdcard path is in /mnt/sdcard

mkdir -p /mnt/sdcard/uv-cache

echo 'export UV_CACHE_DIR="/mnt/sdcard/uv-cache"' >> ~/.bashrc

source ~/.bashrc
```

1. Create a venv and install the dependencies. 

```shell
uv venv --python 3.9.25

uv pip install --extra-index-url https://google-coral.github.io/py-repo/ pycoral~=2.0

uv pip install -r requirements.edge.txt
```

4. Download the models, you can use my models (Converted YOLOv8n-pose & Custom GCN Model) [here](https://drive.google.com/drive/folders/1KFOK7eS0uXo3yNqFNyNA-N1RghYFYC6E)

5. Put the models in `./edge-code/_model`, you can name it differently and set the name on env file. If not configured on env file, this would be the default value:

- **YOLO Model**: `yolov8n-pose_full_integer_quant_edgetpu.tflite`
- **GCN Model**: `GCN_LSTM_best_int8_edgetpu.tflite`

Theoretically you can change the YOLO model (maybe using a stronger one like yolov11n-pose or something) and even the GCN model as long as the GCN model still has the same input and output.

But IDK, haven't try it yet. Let me know if it is actually possible.

6. Set up a `.env` file

```conf
DEVICE_ID="019e0d16-6faf-798b-94e2-48a3090347af"
BACKEND_URL="http://localhost:4000"

LIVEKIT_URL="ws://localhost:7880"
LIVEKIT_DEVICE_SECRET="supersecretvalue"

YOLO_FILE="yolov8n-pose_full_integer_quant_edgetpu.tflite"
GCN_FILE="GCN_LSTM_best_int8_edgetpu.tflite"
```

7. Run the AI Model using Coral's build-in python 3.7

```shell
python3 edge-code/ai_model.py
```

8. Run the app using uv

```shell
uv run --env-file .env edge-code/app.py
```

### To Run the App on Background

We'll be using `systemd` to run the code on background

1. Create a new service file (ex: `mocavision.service`) and then copy the content of `systemd-service/mocavis-edge-code.conf` to your new file. Make sure to edit the content.

```shell
sudo nano /etc/systemd/system/mocavision.service
```

2. Enable the service and allow it to automatically run when the device is started

```shell
sudo systemctl daemon-reload

sudo systemctl enable mocavision.service

sudo systemctl start mocavision.service
```

3. To check the log, run this command

```shell
sudo journalctl -u mocavision.service -f
```
