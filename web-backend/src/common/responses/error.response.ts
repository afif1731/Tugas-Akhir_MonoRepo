export class ErrorResponse extends Error {
  constructor(
    public code: number,
    public message: string,
  ) {
    super(message);
    this.code = code;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
