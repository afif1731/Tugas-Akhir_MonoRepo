import { StatusCodes } from 'http-status-codes';
import { validate as isValidUuid } from 'uuid';

import { ErrorResponse, prisma } from '@/common';
import { livekitListener } from '@/livekit-consumer/listener';
import { paginate } from '@/utils';
import { type DetectedAnomalies } from '~/generated/prisma/client';
import {
  type DetectedAnomaliesOrderByWithRelationInput,
  type DetectedAnomaliesSelect,
  type DetectedAnomaliesWhereInput,
} from '~/generated/prisma/models';

import { type IEditViolenceRequest, type IViolenceListQuery } from './schema';

export abstract class ViolenceService {
  static async getViolenceList(query: IViolenceListQuery) {
    const args: {
      where: DetectedAnomaliesWhereInput;
      select: DetectedAnomaliesSelect;
      orderBy: DetectedAnomaliesOrderByWithRelationInput[];
    } = {
      where: {
        AND: [
          { anomaly_type: query.anomalyType },
          {
            OR: [
              {
                camera_id:
                  query.search && isValidUuid(query.search)
                    ? query.search
                    : undefined,
              },
              {
                id:
                  query.search && isValidUuid(query.search)
                    ? query.search
                    : undefined,
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        camera_id: true,
        anomaly_type: true,
        confidence: true,
        created_at: true,
        is_valid: true,
      },
      orderBy: [
        { id: query.orderById },
        { created_at: query.orderByCreatedAt || 'desc' },
      ],
    };

    const anomalies = await paginate<DetectedAnomalies, typeof args>(
      prisma.detectedAnomalies,
      query.page,
      query.perPage,
      args,
    );

    return anomalies;
  }

  static async getViolenceDetail(anomaly_id: string) {
    const anomaly = await prisma.detectedAnomalies.findUnique({
      where: { id: anomaly_id },
      include: {
        camera: true,
      },
    });

    if (!anomaly)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Anomaly not found');

    return anomaly;
  }

  static async editViolence(anomaly_id: string, data: IEditViolenceRequest) {
    await this.isViolenceExist(anomaly_id);

    await prisma.detectedAnomalies.update({
      where: { id: anomaly_id },
      data: {
        is_valid: data.is_valid,
        is_reported: data.is_reported,
      },
    });

    return true;
  }

  static async deleteViolence(anomaly_id: string) {
    await this.isViolenceExist(anomaly_id);

    await prisma.detectedAnomalies.delete({ where: { id: anomaly_id } });

    return true;
  }

  static async recordDummyViolence(camera_id: string) {
    await livekitListener.triggerDummyRecording(camera_id);

    return true;
  }

  private static async isViolenceExist(anomaly_id: string) {
    const anomaly = await prisma.detectedAnomalies.findUnique({
      where: { id: anomaly_id },
      select: { id: true },
    });

    if (!anomaly)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Anomaly not found');

    return anomaly;
  }
}
