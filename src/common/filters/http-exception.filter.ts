import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorCode, AppErrorResponse } from '../errors';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: AppErrorResponse;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const raw = exception.getResponse();

      if (
        typeof raw === 'object' &&
        raw !== null &&
        'error_code' in raw
      ) {
        body = raw as AppErrorResponse;
      } else {
        const details = this.extractDetails(raw);
        body = {
          statusCode: status,
          error_code: this.mapStatusToErrorCode(status),
          message: this.extractMessage(raw),
        };
        if (details) body.details = details;
      }
    } else {
      this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : exception);
      body = {
        statusCode: status,
        error_code: ErrorCode.INTERNAL_ERROR,
        message: 'Internal server error',
      };
    }

    body.statusCode = status;
    response.status(status).json({
      ...body,
      timestamp: new Date().toISOString(),
    });
  }

  private mapStatusToErrorCode(status: number): ErrorCode {
    switch (status) {
      case 400:
        return ErrorCode.VALIDATION_ERROR;
      case 401:
        return ErrorCode.AUTH_UNAUTHORIZED;
      case 403:
        return ErrorCode.AUTH_FORBIDDEN;
      case 404:
        return ErrorCode.RESOURCE_NOT_FOUND;
      case 409:
        return ErrorCode.RESOURCE_CONFLICT;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }

  private extractMessage(raw: unknown): string {
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'object' && raw !== null) {
      const obj = raw as Record<string, unknown>;
      if (typeof obj.message === 'string') return obj.message;
      if (Array.isArray(obj.message)) return obj.message.join('; ');
    }
    return 'An error occurred';
  }

  private extractDetails(raw: unknown): unknown {
    if (typeof raw === 'object' && raw !== null) {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.message) && obj.message.length > 1) {
        return obj.message;
      }
    }
    return undefined;
  }
}
