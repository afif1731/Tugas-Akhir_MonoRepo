/* eslint-disable unicorn/prefer-logical-operator-over-ternary */
import { CryptoHasher } from 'bun';
import { StatusCodes } from 'http-status-codes';
import { AccessToken } from 'livekit-server-sdk';

import {
  ErrorResponse,
  LiveKitConfig,
  LiveKitRoomClient,
  LiveKitSource,
  prisma,
} from '@/common';

export abstract class LiveKitService {
  static async generateAccessToken({
    source,
    identity,
    user_id,
    user_name,
    device_id,
    camera_id,
    timestamp,
    signature,
  }: {
    source: LiveKitSource;
    identity?: string;
    user_id?: string;
    user_name?: string;
    device_id?: string;
    camera_id?: string;
    timestamp?: Date;
    signature?: string;
  }) {
    if (source === LiveKitSource.WEBSITE && !identity)
      throw new ErrorResponse(StatusCodes.BAD_REQUEST, 'Identity required');

    let tokenIdentity = user_id ? `id_${user_id}` : identity;
    let accessName = identity ? `user ${identity.split('id_')[0]}` : undefined;

    if (source === LiveKitSource.EDGE_DEVICE) {
      if (!device_id || !camera_id)
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          'Device and camera id required',
        );
      else if (!signature)
        throw new ErrorResponse(StatusCodes.BAD_REQUEST, 'Signature required');
      else if (!timestamp)
        throw new ErrorResponse(StatusCodes.BAD_REQUEST, 'Timestamp required');

      const currentTime = new Date(Date.now());

      if (Math.abs(currentTime.getTime() / 1000) - timestamp.getTime() > 180)
        throw new ErrorResponse(StatusCodes.UNAUTHORIZED, 'Request is too old');

      const camera = await prisma.cameras.findFirst({
        where: { AND: [{ id: camera_id }, { edge_device_id: device_id }] },
        select: {
          name: true,
        },
      });

      if (!camera)
        throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Camera not found');

      const signaturePayload = `${device_id}:${camera_id}:${timestamp.getTime()}`;
      const hasher = new CryptoHasher('sha256', LiveKitConfig.API_SECRET);

      hasher.update(signaturePayload);

      const signatureKey = hasher.digest('hex');

      if (signatureKey !== signature)
        throw new ErrorResponse(StatusCodes.UNAUTHORIZED, 'Invalid signature');

      tokenIdentity = `id_${camera_id}`;
      accessName = camera.name;
    }

    const at = new AccessToken(
      LiveKitConfig.API_KEY,
      LiveKitConfig.API_SECRET,
      {
        identity: tokenIdentity,
        name: user_name ? user_name : accessName,
        ttl: '6h',
      },
    );

    at.addGrant({
      roomJoin: true,
      room: LiveKitConfig.ROOM_NAME,
      canPublish: source === LiveKitSource.EDGE_DEVICE,
      canPublishData: source === LiveKitSource.EDGE_DEVICE,
      canSubscribe: source === LiveKitSource.WEBSITE,
    });

    return {
      token: await at.toJwt(),
    };
  }

  static async getRoomList() {
    const rooms = await LiveKitRoomClient.listRooms();

    return rooms;
  }

  static async getRoomParticipants() {
    const participants = await LiveKitRoomClient.listParticipants(
      LiveKitConfig.ROOM_NAME,
    );

    return participants;
  }
}
