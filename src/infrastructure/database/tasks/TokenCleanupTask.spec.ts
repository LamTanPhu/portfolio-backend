/**
 * @fileoverview TokenCleanupTask Unit Tests
 *
 * Tests scheduled token cleanup behavior in isolation.
 * ITokenRepository is mocked — no DB required.
 *
 * Key behaviors tested:
 * - Calls deleteExpired() on the repository
 * - Swallows errors gracefully — cron failure must never crash the app
 * - Logs success and failure with correct messages
 */

import { Test, TestingModule } from '@nestjs/testing'
import { Logger } from '@nestjs/common'
import { TokenCleanupTask } from './TokenCleanupTask'

// =============================================================================
// Mocks
// =============================================================================

const mockTokenRepo = {
    revoke:        jest.fn(),
    isRevoked:     jest.fn(),
    deleteExpired: jest.fn(),
}

// =============================================================================
// Suite
// =============================================================================

describe('TokenCleanupTask', () => {
    let task: TokenCleanupTask
    let logSpy:   jest.SpyInstance
    let errorSpy: jest.SpyInstance

    beforeEach(async () => {
        jest.clearAllMocks()
        mockTokenRepo.deleteExpired.mockResolvedValue(undefined)

        logSpy   = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
        errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {})

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TokenCleanupTask,
                { provide: 'ITokenRepository', useValue: mockTokenRepo },
            ],
        }).compile()

        task = module.get<TokenCleanupTask>(TokenCleanupTask)
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    // ===========================================================================
    // Happy path
    // ===========================================================================
    describe('handleTokenCleanup()', () => {
        it('calls deleteExpired() on the repository', async () => {
            await task.handleTokenCleanup()

            expect(mockTokenRepo.deleteExpired).toHaveBeenCalledTimes(1)
        })

        it('completes without throwing on success', async () => {
            await expect(task.handleTokenCleanup()).resolves.not.toThrow()
        })

        it('logs start message before running', async () => {
            await task.handleTokenCleanup()

            expect(logSpy).toHaveBeenCalledWith('Starting expired token cleanup...')
        })

        it('logs completion message on success', async () => {
            await task.handleTokenCleanup()

            expect(logSpy).toHaveBeenCalledWith('Expired token cleanup complete')
        })

        it('does not log error on success', async () => {
            await task.handleTokenCleanup()

            expect(errorSpy).not.toHaveBeenCalled()
        })
    })

    // ===========================================================================
    // Error handling — must never crash the app
    // ===========================================================================
    describe('handleTokenCleanup() — error handling', () => {
        it('does not throw when deleteExpired() fails', async () => {
            mockTokenRepo.deleteExpired.mockRejectedValue(
                new Error('DB connection lost')
            )

            await expect(task.handleTokenCleanup()).resolves.not.toThrow()
        })

        it('logs error message containing the error detail', async () => {
            mockTokenRepo.deleteExpired.mockRejectedValue(
                new Error('DB connection lost')
            )

            await task.handleTokenCleanup()

            expect(errorSpy).toHaveBeenCalledWith(
                expect.stringContaining('DB connection lost'),
                expect.anything(),
            )
        })

        it('does not log success message on failure', async () => {
            mockTokenRepo.deleteExpired.mockRejectedValue(new Error('fail'))

            await task.handleTokenCleanup()

            expect(logSpy).not.toHaveBeenCalledWith('Expired token cleanup complete')
        })

        it('does not throw on unexpected error types', async () => {
            mockTokenRepo.deleteExpired.mockRejectedValue('string error')

            await expect(task.handleTokenCleanup()).resolves.not.toThrow()
        })

        it('still resolves even after repeated failures', async () => {
            mockTokenRepo.deleteExpired.mockRejectedValue(new Error('Persistent failure'))

            await expect(task.handleTokenCleanup()).resolves.not.toThrow()
            await expect(task.handleTokenCleanup()).resolves.not.toThrow()
        })
    })
})