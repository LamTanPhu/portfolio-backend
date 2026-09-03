/**
 * @fileoverview TrackResumeDownloadCommand Unit Tests
 *
 * Write-only command — verifies ipAddress/browserInfo reach the repository,
 * including the null-safe browserInfo path (not every client sends UA).
 */

import { Test, TestingModule } from '@nestjs/testing'
import { TrackResumeDownloadCommand } from './TrackResumeDownloadCommand'

const mockRepo = {
    save: jest.fn(),
    findAll: jest.fn(),
    deleteOlderThan: jest.fn(),
}

describe('TrackResumeDownloadCommand', () => {
    let command: TrackResumeDownloadCommand

    beforeEach(async () => {
        jest.clearAllMocks()
        mockRepo.save.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [TrackResumeDownloadCommand, { provide: 'IResumeDownloadRepository', useValue: mockRepo }],
        }).compile()

        command = module.get<TrackResumeDownloadCommand>(TrackResumeDownloadCommand)
    })

    it('saves the ip address and browser info', async () => {
        await command.execute('203.0.113.5', 'Mozilla/5.0')

        expect(mockRepo.save).toHaveBeenCalledWith({ ipAddress: '203.0.113.5', browserInfo: 'Mozilla/5.0' })
    })

    it('saves null browserInfo when the client sends no User-Agent', async () => {
        await command.execute('203.0.113.5', null)

        expect(mockRepo.save).toHaveBeenCalledWith({ ipAddress: '203.0.113.5', browserInfo: null })
    })

    it('propagates an error if the repository throws', async () => {
        mockRepo.save.mockRejectedValue(new Error('db down'))

        await expect(command.execute('127.0.0.1', null)).rejects.toThrow('db down')
    })
})
