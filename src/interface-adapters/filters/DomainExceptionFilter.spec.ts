/**
 * @fileoverview DomainExceptionFilter Unit Tests
 *
 * Tests HTTP status code mapping and response shape for all domain errors.
 * Verifies production safety (no stack/path leaks) and dev mode extras.
 * Verifies logging behavior for auth failures, rate limits, and server errors.
 * Uses mock ArgumentsHost — no HTTP server needed.
 */

import { DomainExceptionFilter } from './DomainExceptionFilter'
import { ArgumentsHost, Logger } from '@nestjs/common'
import { ValidationError }     from '../../domain/errors/ValidationError'
import { UnauthorizedError }   from '../../domain/errors/UnauthorizedError'
import { ForbiddenError }      from '../../domain/errors/ForbiddenError'
import { NotFoundError }       from '../../domain/errors/NotFoundError'
import { ConflictError }       from '../../domain/errors/ConflictError'
import { BusinessRuleError }   from '../../domain/errors/BusinessRuleError'
import { RateLimitError }      from '../../domain/errors/RateLimitError'
import { InternalServerError } from '../../domain/errors/InternalServerError'

// =============================================================================
// Mock ArgumentsHost Factory
// =============================================================================

const mockJson   = jest.fn()
const mockStatus = jest.fn().mockReturnValue({ json: mockJson })

function makeMockHost(requestOverrides: Partial<{ method: string; url: string; ip: string | undefined }> = {}): ArgumentsHost {
    const mockRequest = {
        method: 'POST',
        url:    '/api/contact',
        ip:     '127.0.0.1',
        ...requestOverrides,
    }
    return {
        switchToHttp: () => ({
            getResponse: () => ({ status: mockStatus }),
            getRequest:  () => mockRequest,
        }),
    } as unknown as ArgumentsHost
}

const mockHost = makeMockHost()

// =============================================================================
// Suite
// =============================================================================

describe('DomainExceptionFilter', () => {
    let filter:   DomainExceptionFilter
    let warnSpy:  jest.SpyInstance
    let errorSpy: jest.SpyInstance

    beforeEach(() => {
        jest.clearAllMocks()
        warnSpy  = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
        errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
        filter   = new DomainExceptionFilter()
    })

    afterEach(() => {
        delete process.env.NODE_ENV
        jest.restoreAllMocks()
    })

    // ===========================================================================
    // Status code mapping
    // ===========================================================================
    describe('HTTP status code mapping', () => {
        const cases = [
            ['ValidationError',     new ValidationError('bad input'),         400],
            ['UnauthorizedError',   new UnauthorizedError('no auth'),         401],
            ['ForbiddenError',      new ForbiddenError('no access'),          403],
            ['NotFoundError',       new NotFoundError('not found'),           404],
            ['ConflictError',       new ConflictError('duplicate'),           409],
            ['BusinessRuleError',   new BusinessRuleError('rule violated'),   422],
            ['RateLimitError',      new RateLimitError('slow down'),          429],
            ['InternalServerError', new InternalServerError('boom'),          500],
        ] as const

        it.each(cases)('%s maps to HTTP %i', (_, exception, expectedStatus) => {
            filter.catch(exception, mockHost)
            expect(mockStatus).toHaveBeenCalledWith(expectedStatus)
        })
    })

    // ===========================================================================
    // Logging behavior
    // ===========================================================================
    describe('logging behavior', () => {
        it('logs warn for 401 containing message and IP', () => {
            filter.catch(new UnauthorizedError('no auth'), mockHost)

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('no auth'),
            )
        })

        it('logs warn for 401 containing the IP address', () => {
            filter.catch(new UnauthorizedError('no auth'), mockHost)

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('127.0.0.1'),
            )
        })

        it('falls back to unknown when request has no IP', () => {
            const hostNoIp = makeMockHost({ ip: undefined })
            filter.catch(new UnauthorizedError('no auth'), hostNoIp)

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('unknown'),
            )
        })

        it('logs warn for 403 with IP', () => {
            filter.catch(new ForbiddenError('no access'), mockHost)

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('no access'),
            )
        })

        it('logs warn for 429 rate limit containing Rate limit hit', () => {
            filter.catch(new RateLimitError('slow down'), mockHost)

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Rate limit hit'),
            )
        })

        it('logs warn for 429 containing the IP address', () => {
            filter.catch(new RateLimitError('slow down'), mockHost)

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('127.0.0.1'),
            )
        })

        it('logs error for 500 containing the message', () => {
            filter.catch(new InternalServerError('boom'), mockHost)

            expect(errorSpy).toHaveBeenCalledWith(
                expect.stringContaining('boom'),
                expect.anything(),
            )
        })

        it('logs error for 500 containing method and url', () => {
            filter.catch(new InternalServerError('server down'), mockHost)

            expect(errorSpy).toHaveBeenCalledWith(
                expect.stringContaining('/api/contact'),
                expect.anything(),
            )
        })

        it('passes stack to error logger for 5xx', () => {
            filter.catch(new InternalServerError('boom'), mockHost)

            expect(errorSpy).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String), // stack trace
            )
        })

        it('does not log for 400 validation errors', () => {
            filter.catch(new ValidationError('bad input'), mockHost)

            expect(warnSpy).not.toHaveBeenCalled()
            expect(errorSpy).not.toHaveBeenCalled()
        })

        it('does not log for 404 not found errors', () => {
            filter.catch(new NotFoundError('not found'), mockHost)

            expect(warnSpy).not.toHaveBeenCalled()
            expect(errorSpy).not.toHaveBeenCalled()
        })

        it('does not log error for 4xx errors', () => {
            filter.catch(new ValidationError('bad'), mockHost)
            filter.catch(new NotFoundError('missing'), mockHost)
            filter.catch(new ConflictError('conflict'), mockHost)

            expect(errorSpy).not.toHaveBeenCalled()
        })

        it('does not log warn for 400 errors', () => {
            filter.catch(new ValidationError('bad'), mockHost)

            expect(warnSpy).not.toHaveBeenCalled()
        })
    })

    // ===========================================================================
    // Production mode — safety
    // ===========================================================================
    describe('production mode', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'production'
        })

        it('redacts 5xx message in production', () => {
            filter.catch(new InternalServerError('Secret DB connection string'), mockHost)

            expect(mockJson).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'Internal server error' }),
            )
        })

        it('does not include stack in production response', () => {
            filter.catch(new InternalServerError('boom'), mockHost)

            const response = mockJson.mock.calls[0][0]
            expect(response).not.toHaveProperty('stack')
        })

        it('does not include path in production response', () => {
            filter.catch(new ValidationError('bad'), mockHost)

            const response = mockJson.mock.calls[0][0]
            expect(response).not.toHaveProperty('path')
        })

        it('still returns real message for 4xx errors in production', () => {
            filter.catch(new ValidationError('Name is too long'), mockHost)

            expect(mockJson).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'Name is too long' }),
            )
        })
    })

    // ===========================================================================
    // Development mode — debug extras
    // ===========================================================================
    describe('development mode', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'development'
        })

        it('includes path in development response', () => {
            filter.catch(new ValidationError('bad'), mockHost)

            const response = mockJson.mock.calls[0][0]
            expect(response).toHaveProperty('path', '/api/contact')
        })

        it('includes stack in development response', () => {
            filter.catch(new InternalServerError('boom'), mockHost)

            const response = mockJson.mock.calls[0][0]
            expect(response).toHaveProperty('stack')
        })

        it('returns real 5xx message in development', () => {
            filter.catch(new InternalServerError('DB connection failed'), mockHost)

            expect(mockJson).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'DB connection failed' }),
            )
        })
    })

    // ===========================================================================
    // Response shape
    // ===========================================================================
    describe('response shape', () => {
        it('always includes statusCode, error, message, timestamp', () => {
            process.env.NODE_ENV = 'production'
            filter.catch(new NotFoundError('not found'), mockHost)

            expect(mockJson).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 404,
                    error:      'NotFoundError',
                    message:    'not found',
                    timestamp:  expect.any(String),
                }),
            )
        })

        it('timestamp is a valid ISO string', () => {
            filter.catch(new ValidationError('bad'), mockHost)

            const { timestamp } = mockJson.mock.calls[0][0]
            expect(() => new Date(timestamp).toISOString()).not.toThrow()
        })
    })
})