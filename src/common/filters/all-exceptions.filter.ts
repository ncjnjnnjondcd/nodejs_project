import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { requestContext } from '../context/request-context';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Получаем processId из асинхронного контекста либо из заголовков
    const store = requestContext.getStore();
    const processId =
      store?.processId ||
      (request.headers['x-process-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let errorName = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        message = (res as Record<string, unknown>)['message'] || res;
        errorName = ((res as Record<string, unknown>)['error'] as string) || exception.name;
      } else {
        message = res;
        errorName = exception.name;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `[${processId}] Unhandled Exception: ${exception.message}`,
        exception.stack,
      );
      message = 'Internal server error';
      errorName = exception.name;
    } else {
      this.logger.error(`[${processId}] Unknown unhandled error: ${String(exception)}`);
    }

    response.status(status).json({
      statusCode: status,
      error: errorName,
      message,
      processId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
