import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { DomainError } from '../../domain/errors/DomainError'
import { NotFoundError } from '../../domain/errors/NotFoundError'
import { ValidationError } from '../../domain/errors/ValidationError'
import { UnauthorizedError } from '../../domain/errors/UnauthorizedError'

// =============================================================================
// DomainExceptionFilter
// Catches all DomainError subclasses thrown from use cases.
// Maps them to correct HTTP status codes at the interface-adapters layer.
// Domain layer stays clean — zero HTTP knowledge inside use cases.
// Logs 401/403 at warn — repeated patterns indicate probing attacks.
// Logs 5xx at error — always needs investigation.
// Never leaks internal error details in production.
// =============================================================================
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name)

  catch(exception: DomainError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()
    const req = ctx.getRequest<Request>()

    const status = DomainExceptionFilter.resolveStatus(exception)

    // Log unauthorized attempts at warn — useful for detecting probing attacks
    if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
      this.logger.warn(
        `[${exception.name}] ${exception.message} — IP: ${req.ip ?? 'unknown'} — ${req.method} ${req.url}`,
      )
    }

    // Log server errors at error — always requires investigation
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${exception.name}] ${exception.message}`,
        exception.stack,
      )
    }

    // Never leak internal error details in production
    const message =
      process.env.NODE_ENV === 'production' && status >= 500
        ? 'Internal server error'
        : exception.message

    res.status(status).json({
      statusCode: status,
      error:      exception.code,
      message,
      // Include request path in development only — never in production
      ...(process.env.NODE_ENV !== 'production' && { path: req.url }),
    })
  }

  private static resolveStatus(exception: DomainError): number {
    if (exception instanceof NotFoundError)     return HttpStatus.NOT_FOUND
    if (exception instanceof ValidationError)   return HttpStatus.BAD_REQUEST
    if (exception instanceof UnauthorizedError) return HttpStatus.UNAUTHORIZED
    return HttpStatus.INTERNAL_SERVER_ERROR
  }
}