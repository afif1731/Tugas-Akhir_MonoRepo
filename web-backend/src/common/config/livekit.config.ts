import { RoomServiceClient } from 'livekit-server-sdk';

export const LiveKitConfig = {
  URL: process.env.LIVEKIT_HTTP_URL || 'http://127.0.0.1:7880',
  ROOM_NAME: process.env.LIVEKIT_ROOM_NAME || 'surveillance_room',
  API_KEY: process.env.LIVEKIT_API_KEY || 'dev_key',
  API_SECRET: process.env.LIVEKIT_API_SECRET || 'super_secret_value',
};

export const LiveKitRoomClient = new RoomServiceClient(
  LiveKitConfig.URL,
  LiveKitConfig.API_KEY,
  LiveKitConfig.API_SECRET,
);
