/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { type Buffer } from 'node:buffer';

export class FrameStorageService {
  private store = new Map<string, Buffer[]>();
  private timers = new Map<string, NodeJS.Timeout>();

  /**
   * Menyimpan frame baru untuk suatu track.
   * - Menambahkan frame ke dalam list (penyimpanan baru jika track baru).
   * - Membatasi penyimpanan maksimal 100 frame terbaru.
   * - Mengatur waktu kadaluarsa (TTL) menjadi 60 detik. Jika tidak ada frame baru selama 1 menit, otomatis dihapus.
   *
   * @param trackId Nama track (contoh: track_{camera_id})
   * @param frameData Data frame
   */
  async saveFrame(trackId: string, frameData: string | Buffer): Promise<void> {
    if (!this.store.has(trackId)) {
      this.store.set(trackId, []);
    }

    const frames = this.store.get(trackId)!;

    // Masukkan frame terbaru di awal list
    frames.unshift(frameData as Buffer);

    // Pertahankan hanya 100 frame terbaru
    if (frames.length > 100) {
      frames.pop();
    }

    // Reset TTL list menjadi 60 detik setiap ada frame baru masuk
    if (this.timers.has(trackId)) {
      clearTimeout(this.timers.get(trackId));
    }

    this.timers.set(
      trackId,
      setTimeout(() => {
        this.clearTrack(trackId);
      }, 60_000),
    );
  }

  /**
   * Mengambil frame yang tersimpan pada track tertentu.
   * @param trackId Nama track
   * @returns Array berisi data frame
   */
  async getFrames(trackId: string): Promise<Buffer[]> {
    const frames = this.store.get(trackId) || [];

    return [...frames];
  }

  /**
   * Menghapus penyimpanan frame untuk track tertentu secara manual (jika diperlukan).
   * @param trackId Nama track
   */
  async clearTrack(trackId: string): Promise<void> {
    this.store.delete(trackId);

    if (this.timers.has(trackId)) {
      clearTimeout(this.timers.get(trackId));
      this.timers.delete(trackId);
    }
  }
}

export const frameStorageService = new FrameStorageService();
