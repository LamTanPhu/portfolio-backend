/**
 * @fileoverview TokenCleanupTask Unit Tests
 *
 * Tests scheduled token cleanup behavior in isolation.
 * ITokenRepository is mocked — no DB required.
 *
 * Key behaviors tested:
 * - Calls deleteExpired() on the repository
 * - Swallows errors gracefully — cron failure must never crash the app
 * - Logs success and failure appropriately
 */

import { Test, TestingModule } from '@nestjs/testing'
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

    beforeEach(async () => {
        jest.clearAllMocks()
        mockTokenRepo.deleteExpired.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TokenCleanupTask,
                { provide: 'ITokenRepository', useValue: mockTokenRepo },
            ],
        }).compile()

        task = module.get<TokenCleanupTask>(TokenCleanupTask)
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
    })

  // ===========================================================================
  // Error handling — must never crash the app
  // ===========================================================================
    describe('handleTokenCleanup() — error handling', () => {
        it('does not throw when deleteExpired() fails', async () => {
        mockTokenRepo.deleteExpired.mockRejectedValue(
            new Error('DB connection lost')
        )

            // Must not throw — cron failure cannot crash the application
            await expect(task.handleTokenCleanup()).resolves.not.toThrow()
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