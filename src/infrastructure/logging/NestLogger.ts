import { Injectable, Logger } from '@nestjs/common'
import type { ILogger } from '../../application/ports/ILogger'

// =============================================================================
// NestLogger
// Implements ILogger — wraps NestJS built-in Logger.
// Registered as 'ILogger' token in modules that need logging.
// Application layer depends on ILogger interface — never on NestLogger directly.
// =============================================================================
@Injectable()
export class NestLogger implements ILogger {
  private readonly logger = new Logger()

  log(message: string, context?: string): void {
    this.logger.log(message, context)
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, context)
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, trace, context)
  }
}