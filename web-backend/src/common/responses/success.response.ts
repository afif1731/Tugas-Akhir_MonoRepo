/* eslint-disable @typescript-eslint/no-explicit-any */
import { type IPaginationMeta } from '../interfaces';

export class SuccessResponse {
  constructor(
    statusCode: number,
    message: string,
    data?: any,
    meta?: IPaginationMeta,
  ) {
    this.statusCode = statusCode;
    this.message = message;

    if (data !== undefined) this.data = data;
    if (meta !== undefined) this.meta = meta;
  }

  statusCode: number;
  message: string;
  data?: any;
  meta?: IPaginationMeta | undefined;

  json() {
    return {
      success: true,
      statusCode: this.statusCode,
      message: this.message,
      data: this.data || undefined,
      meta: this.meta || undefined,
    };
  }
}
