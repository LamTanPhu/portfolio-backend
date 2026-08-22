/**
 * @fileoverview AuditLogInterceptor Unit Tests
 *
 * Verifies all branches:
 *  - non-mutating methods (GET) never reach the repository
 *  - mutating methods with no req.user (public routes, e.g. POST /contact)
 *    never reach the repository
 *  - mutating admin methods (req.user present) write an audit entry with
 *    the correct actor, method, route, entityType, entityId, and statusCode
 *  - entityType is derived from the controller class name, not the URL
 *  - a repository write failure is caught and logged, never rethrown —
 *    the response the interceptor wraps must still reach the client
 */

import { of, lastValueFrom } from 'rxjs'
import type { CallHandler, ExecutionContext } from '@nestjs/common'
import { AuditLogInterceptor } from './AuditLogInterceptor'

// =============================================================================
// Helpers
// =============================================================================

const mockAuditLogRepo = { save: jest.fn(), deleteOlderThan: jest.fn() }
const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() }

class BlogController {}

function makeCtx(
    req: Record<string, unknown>,
    statusCode = 200,
    controllerClass: new () => unknown = BlogController,
): ExecutionContext {
    return {
        switchToHttp: () => ({
            getRequest: () => req,
            getResponse: () => ({ statusCode }),
        }),
        getClass: () => controllerClass,
    } as unknown as ExecutionContext
}

function makeHandler(returnValue: unknown = { ok: true }): CallHandler {
    return { handle: () => of(returnValue) }
}

// =============================================================================
// Suite
// =============================================================================

describe('AuditLogInterceptor', () => {
    let interceptor: AuditLogInterceptor

    beforeEach(() => {
        jest.clearAllMocks()
        mockAuditLogRepo.save.mockResolvedValue(undefined)
        interceptor = new AuditLogInterceptor(mockAuditLogRepo, mockLogger)
    })

    // ---------------------------------------------------------------------------
    // Non-mutating methods — never reach the repository
    // ---------------------------------------------------------------------------
    describe('non-mutating methods', () => {
        it('skips the repository entirely for GET', async () => {
            const req = { method: 'GET', user: { sub: 1 }, originalUrl: '/api/blogs' }
            await lastValueFrom(interceptor.intercept(makeCtx(req), makeHandler()))

            expect(mockAuditLogRepo.save).not.toHaveBeenCalled()
        })
    })

    // ---------------------------------------------------------------------------
    // Mutating methods without an authenticated user — public routes
    // ---------------------------------------------------------------------------
    describe('mutating public routes (no req.user)', () => {
        it('does not write an audit entry for POST /contact', async () => {
            const req = { method: 'POST', originalUrl: '/api/contact' } // no `user`
            await lastValueFrom(interceptor.intercept(makeCtx(req), makeHandler()))

            expect(mockAuditLogRepo.save).not.toHaveBeenCalled()
        })
    })

    // ---------------------------------------------------------------------------
    // Mutating admin routes — the actual audit path
    // ---------------------------------------------------------------------------
    describe('mutating admin routes (req.user present)', () => {
        it('writes an audit entry with actor, method, route, and status', async () => {
            const req = {
                method: 'POST',
                originalUrl: '/api/blogs?draft=true',
                user: { sub: 7 },
                params: {},
                ip: '203.0.113.5',
            }

            await lastValueFrom(interceptor.intercept(makeCtx(req, 201), makeHandler()))

            expect(mockAuditLogRepo.save).toHaveBeenCalledWith({
                actorId: 7,
                method: 'POST',
                route: '/api/blogs', // query string stripped
                entityType: 'Blog', // BlogController → "Blog"
                entityId: null,
                ipAddress: '203.0.113.5',
                statusCode: 201,
            })
        })

        it('extracts entityId from route params.id', async () => {
            const req = {
                method: 'PATCH',
                originalUrl: '/api/blogs/42',
                user: { sub: 7 },
                params: { id: '42' },
                ip: '203.0.113.5',
            }

            await lastValueFrom(interceptor.intercept(makeCtx(req, 200), makeHandler()))

            expect(mockAuditLogRepo.save).toHaveBeenCalledWith(expect.objectContaining({ entityId: '42' }))
        })

        it('falls back to params.slug when there is no id', async () => {
            const req = {
                method: 'PATCH',
                originalUrl: '/api/blogs/hello-world',
                user: { sub: 7 },
                params: { slug: 'hello-world' },
                ip: '203.0.113.5',
            }

            await lastValueFrom(interceptor.intercept(makeCtx(req, 200), makeHandler()))

            expect(mockAuditLogRepo.save).toHaveBeenCalledWith(expect.objectContaining({ entityId: 'hello-world' }))
        })
    })

    // ---------------------------------------------------------------------------
    // Repository failure — must never surface to the response stream
    // ---------------------------------------------------------------------------
    describe('audit write failure', () => {
        it('logs the error but does not throw, and the response still passes through', async () => {
            mockAuditLogRepo.save.mockRejectedValue(new Error('DB unavailable'))

            const req = {
                method: 'DELETE',
                originalUrl: '/api/blogs/5',
                user: { sub: 7 },
                params: { id: '5' },
                ip: '203.0.113.5',
            }

            const result = await lastValueFrom(interceptor.intercept(makeCtx(req, 204), makeHandler({ ok: true })))

            expect(result).toEqual({ ok: true })

            // The write happens inside a fire-and-forget tap() — flush microtasks
            // so the rejected promise's catch block has run before asserting.
            await new Promise((resolve) => setImmediate(resolve))

            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('/api/blogs/5'),
                expect.anything(),
                'AuditLogInterceptor',
            )
        })
    })
})
