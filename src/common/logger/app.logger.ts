import { Injectable, LoggerService, ConsoleLogger } from '@nestjs/common';
import { requestContext } from '../context/request-context';

@Injectable()
export class AppLogger extends ConsoleLogger implements LoggerService {
  // Переименовано с formatMessage -> formatWithContext
  private formatWithContext(message: unknown): string {
    const store = requestContext.getStore();
    const processId = store?.processId ?? 'SYSTEM';
    const msgString = typeof message === 'object' ? JSON.stringify(message) : String(message);
    return `[${processId}] ${msgString}`;
  }

  log(message: unknown, context?: string): void {
    super.log(this.formatWithContext(message), context);
  }

  error(message: unknown, stack?: string, context?: string): void {
    super.error(this.formatWithContext(message), stack, context);
  }

  warn(message: unknown, context?: string): void {
    super.warn(this.formatWithContext(message), context);
  }

  debug(message: unknown, context?: string): void {
    super.debug(this.formatWithContext(message), context);
  }

  verbose(message: unknown, context?: string): void {
    super.verbose(this.formatWithContext(message), context);
  }
}
