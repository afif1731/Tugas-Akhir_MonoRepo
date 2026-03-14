import { existsSync } from 'node:fs';
import path from 'node:path';

import { type IRegisteredFilePath } from '@/common';

const uploadFileFolder = process.env.FILE_STORAGE_PATH || 'uploads';

export abstract class FileManager {
  /**
   * Fungsi Upload File
   * @param {string} file_folder_path lokasi upload file dengan format /uploads/{file_folder_path}/{filename}
   * @param {File} file file yang mau diupload
   */
  static async upload(file_folder_path: IRegisteredFilePath, file?: File) {
    if (!file) return;

    const fileExtension = path.extname(file.name);

    let cleaned = path
      .basename(file.name, fileExtension)
      .replaceAll(/[^\w -]/g, '');
    cleaned = cleaned.replaceAll(/\s+/g, '_').slice(0, 120);

    const timestamp = Date.now();
    const newFileName = `${cleaned}_${timestamp}${fileExtension}`;

    const newFilePath = `uploads/${file_folder_path}/${newFileName}`;

    await Bun.write(
      `${uploadFileFolder}/${file_folder_path}/${newFileName}`,
      file,
      { createPath: true },
    );

    return newFilePath;
  }

  static async remove(file_path?: string | null) {
    if (!file_path) return;

    const relativePath = file_path.replace(/^uploads\//, '');

    if (!existsSync(`${uploadFileFolder}/${relativePath}`)) return;

    const file = Bun.file(`${uploadFileFolder}/${relativePath}`);
    await file.delete();
  }
}
