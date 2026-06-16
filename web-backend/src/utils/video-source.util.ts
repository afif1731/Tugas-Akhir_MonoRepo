import { readdir } from 'node:fs/promises';
import path from 'node:path';

export abstract class SampleVideoSource {
  private static UPLOAD_FILE_FOLDER =
    process.env.FILE_STORAGE_PATH || 'uploads';
  private static SAMPLE_VIDEO_FOLDER = 'sample-video';
  private static ALLOWED_VIDEO_FORMAT = ['.mp4', '.wmv', '.flv', '.mkv'];

  static async getAllSample() {
    const files = await readdir(
      `${this.UPLOAD_FILE_FOLDER}/${this.SAMPLE_VIDEO_FOLDER}`,
    );

    return files.filter(file =>
      this.ALLOWED_VIDEO_FORMAT.includes(path.extname(file)),
    );
  }
}
