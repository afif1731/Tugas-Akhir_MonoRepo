import { StatusCodes } from 'http-status-codes';

import { ErrorResponse } from '@/common';
import { AdditionalValidation, FileManager, SampleVideoSource } from '@/utils';

import {
  type IVideoSampleDeleteRequest,
  type IVideoSampleUploadRequest,
} from './schema';

export abstract class SystemService {
  static async getAllVideoSample() {
    return await SampleVideoSource.getAllSample();
  }

  static async uploadVideoSample(data: IVideoSampleUploadRequest) {
    AdditionalValidation.isVideoValid(data.video_file);

    const newVideoPath = await FileManager.upload(
      'sample-video',
      data.video_file,
      true,
    );

    if (!newVideoPath)
      throw new ErrorResponse(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to upload sample video to the server',
      );

    return { video_path: newVideoPath };
  }

  static async deleteVideoSample(data: IVideoSampleDeleteRequest) {
    const sampleVideoPath = `sample-video/${data.video_name}`;

    const isVideoDeleted = await FileManager.remove(sampleVideoPath);

    if (isVideoDeleted === false)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Video not found');

    return;
  }
}
