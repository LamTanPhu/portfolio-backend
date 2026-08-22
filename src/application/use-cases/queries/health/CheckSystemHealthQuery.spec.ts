/**
 * @fileoverview CheckSystemHealthQuery Unit Tests
 *
 * Mocks IHealthCheckService via its string DI token — same pattern as
 * every other Query class's spec in this codebase. No Prisma, no terminus,
 * no HTTP concerns here at all; that's the point of this layer existing.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { CheckSystemHealthQuery } from './CheckSystemHealthQuery'

const mockHealthCheckService = {
    checkDatabase: jest.fn(),
}

describe('CheckSystemHealthQuery', () => {
    let query: CheckSystemHealthQuery

    beforeEach(async () => {
        jest.clearAllMocks()

        const module: TestingModule = await Test.createTestingModule({
            providers: [CheckSystemHealthQuery, { provide: 'IHealthCheckService', useValue: mockHealthCheckService }],
        }).compile()

        query = module.get<CheckSystemHealthQuery>(CheckSystemHealthQuery)
    })

    it('returns isDatabaseHealthy: true when the port reports the database is up', async () => {
        mockHealthCheckService.checkDatabase.mockResolvedValue(true)

        const result = await query.execute()

        expect(result).toEqual({ isDatabaseHealthy: true })
    })

    it('returns isDatabaseHealthy: false when the port reports the database is down', async () => {
        mockHealthCheckService.checkDatabase.mockResolvedValue(false)

        const result = await query.execute()

        expect(result).toEqual({ isDatabaseHealthy: false })
    })

    it('propagates an error if the port itself throws rather than returning false', async () => {
        mockHealthCheckService.checkDatabase.mockRejectedValue(new Error('unexpected'))

        await expect(query.execute()).rejects.toThrow('unexpected')
    })
})
