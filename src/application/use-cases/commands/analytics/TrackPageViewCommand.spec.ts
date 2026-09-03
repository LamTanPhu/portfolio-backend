/**
 * @fileoverview TrackPageViewCommand Unit Tests
 *
 * Thin pass-through command — the only behavior to verify is that the
 * route string reaches the repository's atomic increment unchanged.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { TrackPageViewCommand } from './TrackPageViewCommand'

const mockRepo = {
    increment: jest.fn(),
    findByRoute: jest.fn(),
    findAll: jest.fn(),
}

describe('TrackPageViewCommand', () => {
    let command: TrackPageViewCommand

    beforeEach(async () => {
        jest.clearAllMocks()
        mockRepo.increment.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [TrackPageViewCommand, { provide: 'IPageViewRepository', useValue: mockRepo }],
        }).compile()

        command = module.get<TrackPageViewCommand>(TrackPageViewCommand)
    })

    it('increments the counter for the given route', async () => {
        await command.execute('/blog/my-post')

        expect(mockRepo.increment).toHaveBeenCalledWith('/blog/my-post')
        expect(mockRepo.increment).toHaveBeenCalledTimes(1)
    })

    it('passes the route through unmodified, even with query-like characters', async () => {
        await command.execute('/projects?sort=recent')

        expect(mockRepo.increment).toHaveBeenCalledWith('/projects?sort=recent')
    })

    it('resolves without a return value', async () => {
        await expect(command.execute('/')).resolves.toBeUndefined()
    })

    it('propagates an error if the repository throws', async () => {
        mockRepo.increment.mockRejectedValue(new Error('db down'))

        await expect(command.execute('/blog')).rejects.toThrow('db down')
    })
})
