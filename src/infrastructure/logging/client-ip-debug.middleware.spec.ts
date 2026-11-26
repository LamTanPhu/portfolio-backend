/**
 * @fileoverview clientIpDebugMiddleware Unit Tests
 */

import type { NextFunction, Request, Response } from 'express'
import { clientIpDebugMiddleware } from './client-ip-debug.middleware'

const makeReq = (overrides: Partial<Request> = {}): Request =>
    ({
        ip: '203.0.113.9',
        ips: ['198.51.100.2'],
        headers: { 'x-forwarded-for': '203.0.113.9, 198.51.100.2' },
        socket: { remoteAddress: '10.0.0.5' },
        ...overrides,
    }) as unknown as Request

describe('clientIpDebugMiddleware', () => {
    const logger = { warn: jest.fn<void, [string]>() }
    const next: NextFunction = jest.fn()

    beforeEach(() => jest.clearAllMocks())

    it('logs the resolved ip, the ips chain, the socket address and the raw X-Forwarded-For', () => {
        clientIpDebugMiddleware(logger)(makeReq(), {} as Response, next)

        const line = logger.warn.mock.calls[0]?.[0] ?? ''
        expect(line).toContain('req.ip=203.0.113.9')
        expect(line).toContain('req.ips=["198.51.100.2"]')
        expect(line).toContain('socket=10.0.0.5')
        expect(line).toContain('x-forwarded-for=203.0.113.9, 198.51.100.2')
    })

    it('copes with a missing header, a missing ip and an array-valued header', () => {
        clientIpDebugMiddleware(logger)(
            makeReq({ ip: undefined, headers: {}, socket: {} as Request['socket'] }),
            {} as Response,
            next,
        )
        clientIpDebugMiddleware(logger)(
            makeReq({ headers: { 'x-forwarded-for': ['1.1.1.1', '2.2.2.2'] } }),
            {} as Response,
            next,
        )

        expect(logger.warn.mock.calls[0]?.[0]).toContain('req.ip=undefined')
        expect(logger.warn.mock.calls[0]?.[0]).toContain('x-forwarded-for=none')
        expect(logger.warn.mock.calls[1]?.[0]).toContain('x-forwarded-for=1.1.1.1 | 2.2.2.2')
    })

    it('always hands control on to the next handler', () => {
        clientIpDebugMiddleware(logger)(makeReq(), {} as Response, next)

        expect(next).toHaveBeenCalledTimes(1)
    })
})
