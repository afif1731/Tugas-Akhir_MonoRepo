// Tipe untuk keseluruhan payload yang diterima dari topik 'violence_detection'
export interface ViolenceDetectionPayload {
  label: string;
  confidence: number;
  camera_id: string;
  fps: number;
  skeletons: AbsoluteSkeleton[];
}
// Tipe untuk masing-masing objek skeleton (maksimal 3 objek dalam array)
export interface AbsoluteSkeleton {
  /**
   * Koordinat Bounding Box dari individu tersebut.
   * Format tuple: [x, y, width, height] dalam koordinat absolut piksel (misal resolusi 640x480).
   * Nilai x dan y adalah koordinat titik sudut KIRI-ATAS kotak.
   */
  box: [number, number, number, number];
  /**
   * 17 titik keypoints sendi dari model YOLOv8 Pose.
   * Setiap keypoint direpresentasikan sebagai array tuple [x, y, confidence].
   * Nilai x dan y adalah koordinat absolut piksel (relatif terhadap frame 640x480).
   * Nilai confidence berkisar antara 0.0 hingga 1.0.
   */
  keypoints: [number, number, number][];
}
