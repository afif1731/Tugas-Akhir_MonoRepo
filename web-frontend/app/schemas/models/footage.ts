export interface ICamera {
  id: string;
  name: string;
  slug: string;
  source: string;
  source_type: string;
  edge_device_id: string;
  status: string;
  error_message?: string;
  cv_treshold?: number;
}

export interface IDetectedAnomaly {
  id: string;
  camera_id?: string;
  video_path?: string;
  video_duration?: number;
  video_start_date: string;
  video_end_date: string;
  anomaly_type: 'ASSAULT' | 'FIGHTING' | 'ROBBERY' | 'SHOOTING';
  confidence: number;
  is_valid?: boolean;
  is_reported: boolean;
  report_sent: unknown;
  camera?: ICamera;
  created_at: string;
  updated_at: string;
}
