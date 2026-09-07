/**
 * @fileoverview GetJobsQuery Unit Tests
 *
 * Repository already returns DTOs directly (see IJobReadRepository) —
 * this query is a thin cache wrapper with no mapping of its own.
 */

import { GetJobsQuery } from './GetJobsQuery'

const repo = {
    findPublished: jest.fn(),
    findAll: jest.fn(),
}

const cacheQuery = {
    getOrSet: jest.fn(),
    getOrSetWithProfile: jest.fn((_key: string, _profile: string, factory: () => Promise<any>) => factory()),
    delete: jest.fn(),
    deletePattern: jest.fn(),
    clear: jest.fn(),
}

const makeJobDTO = (overrides = {}) => ({
    id: 1,
    companyName: 'Acme Corp',
    role: 'Senior Backend Engineer',
    startedAt: '2022-01-01T00:00:00.000Z',
    endedAt: null,
    isEnded: false,
    isPublic: true,
    ...overrides,
})

describe('GetJobsQuery', () => {
    let query: GetJobsQuery

    beforeEach(() => {
        jest.clearAllMocks()
        cacheQuery.getOrSetWithProfile.mockImplementation(
            (_key: string, _profile: string, factory: () => Promise<any>) => factory(),
        )
        repo.findPublished.mockResolvedValue([makeJobDTO()])

        query = new GetJobsQuery(repo, cacheQuery)
    })

    it('returns the jobs exactly as provided by the repository', async () => {
        const result = await query.execute()

        expect(result).toEqual([makeJobDTO()])
    })

    it('calls repo.findPublished, not findAll — hidden jobs must never appear here', async () => {
        await query.execute()

        expect(repo.findPublished).toHaveBeenCalledTimes(1)
        expect(repo.findAll).not.toHaveBeenCalled()
    })

    it('uses the LONG cache profile under the job:list:public key', async () => {
        await query.execute()

        expect(cacheQuery.getOrSetWithProfile).toHaveBeenCalledWith('job:list:public', 'LONG', expect.any(Function))
    })

    it('returns an empty array when there is no published work experience', async () => {
        repo.findPublished.mockResolvedValue([])

        const result = await query.execute()

        expect(result).toEqual([])
    })
})
