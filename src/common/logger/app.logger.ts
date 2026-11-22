import { Injectable, LoggerService, ConsoleLogger } from '@nestjs/common';
import { requestContext } from '../context/request-context';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppLogger extends ConsoleLogger implements LoggerService {
  private readonly logDir = path.join(process.cwd(), 'logs');
  private readonly appLogPath = path.join(this.logDir, 'app.log');
  private readonly errorLogPath = path.join(this.logDir, 'error.log');

  constructor(context?: string) {
    super(context ?? 'App');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatWithContext(message: unknown): string {
    const store = requestContext.getStore();
    const processId = store?.processId ?? 'SYSTEM';
    const msgString = typeof message === 'object' ? JSON.stringify(message) : String(message);
    return `[${processId}] ${msgString}`;
  }

  private writeToFile(
    filePath: string,
    level: string,
    formattedMsg: string,
    context?: string,
    stack?: string,
  ): void {
    const timestamp = new Date().toISOString();
    const ctx = context || this.context || 'App';
    const stackLine = stack ? `\n${stack}` : '';
    const line = `${timestamp} [${level}] [${ctx}] ${formattedMsg}${stackLine}\n`;

    fs.appendFile(filePath, line, (err) => {
      if (err) {
        process.stderr.write(`Failed to write log: ${err.message}\n`);
      }
    });
  }

  log(message: unknown, context?: string): void {
    const formatted = this.formatWithContext(message);
    super.log(formatted, context);
    this.writeToFile(this.appLogPath, 'LOG', formatted, context);
  }

  error(message: unknown, stack?: string, context?: string): void {
    const formatted = this.formatWithContext(message);
    super.error(formatted, stack, context);
    this.writeToFile(this.appLogPath, 'ERROR', formatted, context, stack);
    this.writeToFile(this.errorLogPath, 'ERROR', formatted, context, stack);
  }

  warn(message: unknown, context?: string): void {
    const formatted = this.formatWithContext(message);
    super.warn(formatted, context);
    this.writeToFile(this.appLogPath, 'WARN', formatted, context);
  }

  debug(message: unknown, context?: string): void {
    const formatted = this.formatWithContext(message);
    super.debug(formatted, context);
    this.writeToFile(this.appLogPath, 'DEBUG', formatted, context);
  }

  verbose(message: unknown, context?: string): void {
    const formatted = this.formatWithContext(message);
    super.verbose(formatted, context);
    this.writeToFile(this.appLogPath, 'VERBOSE', formatted, context);
  }
}
