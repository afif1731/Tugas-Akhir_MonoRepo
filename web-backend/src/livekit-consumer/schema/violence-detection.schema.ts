/* eslint-disable @typescript-eslint/naming-convention */
export const ViolenceEventLabel = {
  normal_event: 'normal_event',
  assault: 'assault',
  fighting: 'fighting',
  robbery: 'robbery',
  shooting: 'shooting',
  analyzing: 'analyzing',
} as const;

export type IViolenceEventLabel = keyof typeof ViolenceEventLabel;

export interface AbsoluteSkeleton {
  x: number;
  y: number;
}

export interface ViolenceEvent {
  group_id: number;
  label: IViolenceEventLabel;
  confidence: number;
  skeletons: AbsoluteSkeleton[];
}

export interface ViolenceDetectionPayload {
  camera_id: string;
  fps: number;
  events: ViolenceEvent[];
}

export interface RecordingSession {
  cameraId: string;
  frames: Buffer[];
  remaining: number;
  width?: number;
  height?: number;
  payload: ViolenceDetectionPayload;
  highestConfidence: number;
  detectedLabel: string;
}
