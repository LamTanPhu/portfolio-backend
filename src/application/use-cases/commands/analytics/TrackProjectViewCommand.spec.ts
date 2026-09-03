/**
 * @fileoverview TrackProjectViewCommand Unit Tests
 *
 * Thin pass-through command — verifies the projectId reaches the
 * repository's daily-bucketed increment unchanged.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { TrackProjectViewCommand } from './TrackProjectViewCommand'

const mockRepo = {
    increment: jest.fn(),
    getTotalViews: jest.fn(),
    findByProject: jest.fn(),
}

describe('TrackProjectViewCommand', () => {
    let command: TrackProjectViewCommand

    beforeEach(async () => {
        jest.clearAllMocks()
        mockRepo.increment.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [TrackProjectViewCommand, { provide: 'IProjectViewRepository', useValue: mockRepo }],
        }).compile()

        command = module.get<TrackProjectViewCommand>(TrackProjectViewCommand)
    })

    it("increments today's view count for the given project id", async () => {
        await command.execute(42)

        expect(mockRepo.increment).toHaveBeenCalledWith(42)
        expect(mockRepo.increment).toHaveBeenCalledTimes(1)
    })

    it('does not call getTotalViews or findByProject — write-only command', async () => {
        await command.execute(1)

        expect(mockRepo.getTotalViews).not.toHaveBeenCalled()
        expect(mockRepo.findByProject).not.toHaveBeenCalled()
    })

    it('propagates an error if the repository throws', async () => {
        mockRepo.increment.mockRejectedValue(new Error('constraint violation'))

        await expect(command.execute(1)).rejects.toThrow('constraint violation')
    })
})
