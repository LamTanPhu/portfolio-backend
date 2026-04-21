import { Injectable, Logger } from '@nestjs/common'
import { ILogger } from '../../application/ports/ILogger'

@Injectable()
export class NestLogger implements ILogger {
  private readonly logger = new Logger()
  log(message: string, context?: string) { this.logger.log(message, context) }
  warn(message: string, context?: string) { this.logger.warn(message, context) }
  error(message: string, trace?: string, context?: string) { this.logger.error(message, trace, context) }
}
