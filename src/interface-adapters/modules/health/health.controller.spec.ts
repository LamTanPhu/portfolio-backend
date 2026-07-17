/**
 * @fileoverview HealthController Unit Tests
 *
 * Mocks terminus's HealthCheckService/HealthIndicatorService and the
 * application-layer CheckSystemHealthQuery directly. Unlike the first
 * version of this file, this needs no jest.mock() workaround for Prisma —
 * HealthController no longer imports PrismaService or any Prisma-touching
 * class at all; that dependency now lives behind CheckSystemHealthQuery,
 * which itself only depends on the IHealthCheckService port (see
 * CheckSystemHealthQuery.spec.ts for that layer's own tests).
 */

import { HealthCheckService, HealthIndicatorService } from '@nestjs/terminus'
import { Test, TestingModule } from '@nestjs/testing'
import { CheckSystemHealthQuery } from '../../../application/use-cases/queries/health/CheckSystemHealthQuery'
import { HealthController } from './health.controller'

const mockHealthCheckService = {
    check: jest.fn(),
}

const mockUpResult    = { database: { status: 'up' } }
const mockDownResult  = { database: { status: 'down' } }

const mockIndicatorSession = {
    up:   jest.fn().mockReturnValue(mockUpResult),
    down: jest.fn().mockReturnValue(mockDownResult),
}

const mockHealthIndicatorService = {
    check: jest.fn().mockReturnValue(mockIndicatorSession),
}

const mockCheckSystemHealthQuery = {
    execute: jest.fn(),
}

describe('HealthController', () => {
    let controller: HealthController

    beforeEach(async () => {
        jest.clearAllMocks()
        mockHealthIndicatorService.check.mockReturnValue(mockIndicatorSession)

        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                { provide: HealthCheckService,       useValue: mockHealthCheckService       },
                { provide: HealthIndicatorService,   useValue: mockHealthIndicatorService   },
                { provide: CheckSystemHealthQuery,   useValue: mockCheckSystemHealthQuery   },
            ],
        }).compile()

        controller = module.get<HealthController>(HealthController)
    })

    it('delegates to HealthCheckService.check() with exactly one indicator', async () => {
        mockHealthCheckService.check.mockResolvedValue({ status: 'ok', info: {}, error: {}, details: {} })

        await controller.check()

        expect(mockHealthCheckService.check).toHaveBeenCalledTimes(1)
        expect(mockHealthCheckService.check).toHaveBeenCalledWith([expect.any(Function)])
    })

    it('reports the indicator as up when CheckSystemHealthQuery says the database is healthy', async () => {
        mockCheckSystemHealthQuery.execute.mockResolvedValue({ isDatabaseHealthy: true })
        mockHealthCheckService.check.mockImplementation(async (indicators: Array<() => unknown>) => {
            const results = await Promise.all(indicators.map(fn => fn()))
            return { status: 'ok', info: results[0], error: {}, details: results[0] }
        })

        const result = await controller.check()

        expect(mockHealthIndicatorService.check).toHaveBeenCalledWith('database')
        expect(mockIndicatorSession.up).toHaveBeenCalled()
        expect(mockIndicatorSession.down).not.toHaveBeenCalled()
        expect(result.info).toEqual(mockUpResult)
    })

    it('reports the indicator as down when CheckSystemHealthQuery says the database is unreachable', async () => {
        mockCheckSystemHealthQuery.execute.mockResolvedValue({ isDatabaseHealthy: false })
        mockHealthCheckService.check.mockImplementation(async (indicators: Array<() => unknown>) => {
            const results = await Promise.all(indicators.map(fn => fn()))
            return { status: 'error', info: {}, error: results[0], details: results[0] }
        })

        const result = await controller.check()

        expect(mockIndicatorSession.down).toHaveBeenCalled()
        expect(mockIndicatorSession.up).not.toHaveBeenCalled()
        expect(result.error).toEqual(mockDownResult)
    })

    it('propagates an error if CheckSystemHealthQuery itself throws', async () => {
        mockCheckSystemHealthQuery.execute.mockRejectedValue(new Error('unexpected failure'))
        mockHealthCheckService.check.mockImplementation(async (indicators: Array<() => unknown>) => {
            await Promise.all(indicators.map(fn => fn()))
        })

        await expect(controller.check()).rejects.toThrow('unexpected failure')
    })
})