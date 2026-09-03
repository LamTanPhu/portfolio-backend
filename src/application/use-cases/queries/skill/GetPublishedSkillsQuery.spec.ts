/**
 * @fileoverview GetPublishedSkillsQuery Unit Tests
 *
 * Repository already returns DTOs directly (see ISkillReadRepository) —
 * this query is a thin cache wrapper with no mapping of its own.
 */

import { GetPublishedSkillsQuery } from './GetPublishedSkillsQuery'

const repo = {
    findPublished: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
}

const cacheQuery = {
    getOrSet: jest.fn(),
    getOrSetWithProfile: jest.fn((_key: string, _profile: string, factory: () => Promise<any>) => factory()),
    delete: jest.fn(),
    deletePattern: jest.fn(),
    clear: jest.fn(),
}

const makeSkillDTO = (overrides = {}) => ({
    id: 1,
    name: 'TypeScript',
    imageUrl: 'https://cdn.example.com/typescript.svg',
    category: 'backend',
    ...overrides,
})

describe('GetPublishedSkillsQuery', () => {
    let query: GetPublishedSkillsQuery

    beforeEach(() => {
        jest.clearAllMocks()
        cacheQuery.getOrSetWithProfile.mockImplementation(
            (_key: string, _profile: string, factory: () => Promise<any>) => factory(),
        )
        repo.findPublished.mockResolvedValue([makeSkillDTO()])

        query = new GetPublishedSkillsQuery(repo, cacheQuery)
    })

    it('returns the skills exactly as provided by the repository', async () => {
        const result = await query.execute()

        expect(result).toEqual([makeSkillDTO()])
    })

    it('uses the LONG cache profile under the skill:list:public key', async () => {
        await query.execute()

        expect(cacheQuery.getOrSetWithProfile).toHaveBeenCalledWith('skill:list:public', 'LONG', expect.any(Function))
    })

    it('calls repo.findPublished, not findAll — hidden skills must never appear here', async () => {
        await query.execute()

        expect(repo.findPublished).toHaveBeenCalledTimes(1)
        expect(repo.findAll).not.toHaveBeenCalled()
    })

    it('returns an empty array when there are no published skills', async () => {
        repo.findPublished.mockResolvedValue([])

        const result = await query.execute()

        expect(result).toEqual([])
    })
})
