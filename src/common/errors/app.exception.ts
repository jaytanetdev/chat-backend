import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export interface AppErrorResponse {
  statusCode: number;
  error_code: ErrorCode;
  message: string;
  details?: unknown;
}

export class AppException extends HttpException {
  public readonly errorCode: ErrorCode;

  constructor(
    errorCode: ErrorCode,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: unknown,
  ) {
    const body: AppErrorResponse = {
      statusCode,
      error_code: errorCode,
      message,
      ...(details !== undefined && { details }),
    };
    super(body, statusCode);
    this.errorCode = errorCode;
  }
}
