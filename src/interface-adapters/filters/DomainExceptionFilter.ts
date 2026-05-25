/**
 * @fileoverview DomainExceptionFilter
 * 
 * Global filter that catches all DomainErrors and maps them to proper HTTP responses.
 * Keeps domain layer completely clean of HTTP concerns.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { DomainError } from '../../domain/errors'

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name)

  catch(exception: DomainError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const statusCode = exception.statusCode

    // ─── Logging ─────────────────────────────────────────────────────
    if (statusCode === 401 || statusCode === 403) {
      this.logger.warn(
        `[${exception.name}] ${exception.message} | IP: ${request.ip ?? 'unknown'} | ${request.method} ${request.url}`,
      )
    } else if (statusCode >= 500) {
      this.logger.error(
        `[${exception.name}] ${exception.message}`,
        exception.stack,
      )
    }

    // ─── Safe Response ───────────────────────────────────────────────
    const isProduction = process.env.NODE_ENV === 'production'

    response.status(statusCode).json({
      statusCode,
      error: exception.code,
      message: isProduction && statusCode >= 500
        ? 'Internal server error'
        : exception.message,
      timestamp: new Date().toISOString(),
      ...( !isProduction && {
        path: request.url,
        stack: exception.stack,
      }),
    })
  }
}