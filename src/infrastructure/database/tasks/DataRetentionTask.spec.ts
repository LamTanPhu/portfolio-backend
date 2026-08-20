/**
 * @fileoverview DataRetentionTask Unit Tests
 *
 * Tests scheduled retention cleanup behavior in isolation.
 * All three repositories are mocked — no DB required.
 *
 * Key behaviors tested:
 * - Calls deleteOlderThan() on all three repositories with the correct cutoff
 * - One repository failing does not stop the other two from running
 * - Swallows errors gracefully — cron failure must never crash the app
 * - Logs success and failure with correct messages
 */

import { Test, TestingModule } from '@nestjs/testing'
import { Logger } from '@nestjs/common'
import { DataRetentionTask } from './DataRetentionTask'

// =============================================================================
// Mocks
// =============================================================================

const mockContactRepo = {
    save:            jest.fn(),
    delete:          jest.fn(),
    deleteOlderThan: jest.fn(),
}

const mockResumeRepo = {
    save:            jest.fn(),
    findAll:         jest.fn(),
    deleteOlderThan: jest.fn(),
}

const mockAuditLogRepo = {
    save:            jest.fn(),
    deleteOlderThan: jest.fn(),
}

// =============================================================================
// Suite
// =============================================================================

describe('DataRetentionTask', () => {
    let task: DataRetentionTask
    let logSpy:   jest.SpyInstance
    let errorSpy: jest.SpyInstance

    beforeEach(async () => {
        jest.clearAllMocks()
        mockContactRepo.deleteOlderThan.mockResolvedValue(undefined)
        mockResumeRepo.deleteOlderThan.mockResolvedValue(undefined)
        mockAuditLogRepo.deleteOlderThan.mockResolvedValue(undefined)

        logSpy   = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
        errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {})

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DataRetentionTask,
                { provide: 'IContactWriteRepository',  useValue: mockContactRepo   },
                { provide: 'IResumeDownloadRepository', useValue: mockResumeRepo   },
                { provide: 'IAuditLogWriteRepository',  useValue: mockAuditLogRepo },
            ],
        }).compile()

        task = module.get<DataRetentionTask>(DataRetentionTask)
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    // ===========================================================================
    // Happy path
    // ===========================================================================
    describe('handleDataRetention()', () => {
        it('calls deleteOlderThan() on all three repositories', async () => {
            await task.handleDataRetention()

            expect(mockContactRepo.deleteOlderThan).toHaveBeenCalledTimes(1)
            expect(mockResumeRepo.deleteOlderThan).toHaveBeenCalledTimes(1)
            expect(mockAuditLogRepo.deleteOlderThan).toHaveBeenCalledTimes(1)
        })

        it('uses a 7-day cutoff for contact messages', async () => {
            let captured: Date | undefined
            mockContactRepo.deleteOlderThan.mockImplementation((cutoff: Date) => {
                captured = cutoff
            })

            const before = Date.now()
            await task.handleDataRetention()
            const after = Date.now()

            const expectedMs = 7 * 24 * 60 * 60 * 1000
            expect(captured).toBeDefined()
            expect(before - captured!.getTime()).toBeGreaterThanOrEqual(expectedMs - 1000)
            expect(after - captured!.getTime()).toBeLessThanOrEqual(expectedMs + 1000)
        })

        it('uses a 14-day cutoff for resume downloads', async () => {
            let captured: Date | undefined
            mockResumeRepo.deleteOlderThan.mockImplementation((cutoff: Date) => {
                captured = cutoff
            })

            await task.handleDataRetention()

            const expectedMs = 14 * 24 * 60 * 60 * 1000
            expect(captured).toBeDefined()
            expect(Date.now() - captured!.getTime()).toBeGreaterThanOrEqual(expectedMs - 1000)
        })

        it('uses a 47-day cutoff for audit logs', async () => {
            let captured: Date | undefined
            mockAuditLogRepo.deleteOlderThan.mockImplementation((cutoff: Date) => {
                captured = cutoff
            })

            await task.handleDataRetention()

            const expectedMs = 47 * 24 * 60 * 60 * 1000
            expect(captured).toBeDefined()
            expect(Date.now() - captured!.getTime()).toBeGreaterThanOrEqual(expectedMs - 1000)
        })

        it('completes without throwing when all cleanups succeed', async () => {
            await expect(task.handleDataRetention()).resolves.not.toThrow()
        })

        it('logs a start and completion message', async () => {
            await task.handleDataRetention()

            expect(logSpy).toHaveBeenCalledWith('Starting data retention cleanup...')
            expect(logSpy).toHaveBeenCalledWith('Data retention cleanup complete')
        })

        it('does not log error on success', async () => {
            await task.handleDataRetention()

            expect(errorSpy).not.toHaveBeenCalled()
        })
    })

    // ===========================================================================
    // Partial failure — one resource failing must not block the others
    // ===========================================================================
    describe('handleDataRetention() — partial failure isolation', () => {
        it('still cleans up resume downloads and audit logs when contact cleanup fails', async () => {
            mockContactRepo.deleteOlderThan.mockRejectedValue(new Error('DB connection lost'))

            await task.handleDataRetention()

            expect(mockResumeRepo.deleteOlderThan).toHaveBeenCalledTimes(1)
            expect(mockAuditLogRepo.deleteOlderThan).toHaveBeenCalledTimes(1)
        })

        it('still cleans up contact messages and audit logs when resume cleanup fails', async () => {
            mockResumeRepo.deleteOlderThan.mockRejectedValue(new Error('DB connection lost'))

            await task.handleDataRetention()

            expect(mockContactRepo.deleteOlderThan).toHaveBeenCalledTimes(1)
            expect(mockAuditLogRepo.deleteOlderThan).toHaveBeenCalledTimes(1)
        })

        it('still cleans up contact messages and resume downloads when audit cleanup fails', async () => {
            mockAuditLogRepo.deleteOlderThan.mockRejectedValue(new Error('DB connection lost'))

            await task.handleDataRetention()

            expect(mockContactRepo.deleteOlderThan).toHaveBeenCalledTimes(1)
            expect(mockResumeRepo.deleteOlderThan).toHaveBeenCalledTimes(1)
        })

        it('does not throw even when all three cleanups fail', async () => {
            mockContactRepo.deleteOlderThan.mockRejectedValue(new Error('fail'))
            mockResumeRepo.deleteOlderThan.mockRejectedValue(new Error('fail'))
            mockAuditLogRepo.deleteOlderThan.mockRejectedValue(new Error('fail'))

            await expect(task.handleDataRetention()).resolves.not.toThrow()
        })

        it('logs an error for each failed resource', async () => {
            mockContactRepo.deleteOlderThan.mockRejectedValue(new Error('fail'))
            mockAuditLogRepo.deleteOlderThan.mockRejectedValue(new Error('fail'))

            await task.handleDataRetention()

            expect(errorSpy).toHaveBeenCalledWith(
                expect.stringContaining('contact messages'),
                expect.anything(),
            )
            expect(errorSpy).toHaveBeenCalledWith(
                expect.stringContaining('audit logs'),
                expect.anything(),
            )
        })

        it('does not throw on unexpected error types', async () => {
            mockContactRepo.deleteOlderThan.mockRejectedValue('string error')

            await expect(task.handleDataRetention()).resolves.not.toThrow()
        })
    })
})
