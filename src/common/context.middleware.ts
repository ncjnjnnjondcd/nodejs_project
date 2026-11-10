import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { requestContext } from '../common/context/request-context';

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // зчитуємо переданий клієнтом заголовок або генеруємо новий traceId
    const processId =
      (req.headers['x-process-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      randomUUID();

    // додаємо заголовок у відповідь
    res.setHeader('x-process-id', processId);

    // усі наступні операції всередині колбеку матимуть доступ до цього processId
    requestContext.run({ processId }, () => {
      next();
    });
  }
}
