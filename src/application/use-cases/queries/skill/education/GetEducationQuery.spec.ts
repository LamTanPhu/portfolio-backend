/**
 * @fileoverview GetEducationQuery Unit Tests
 *
 * Repository already returns DTOs directly (see IEducationReadRepository)
 * — this query is a thin cache wrapper with no mapping of its own.
 */

import { GetEducationQuery } from './GetEducationQuery'

const repo = {
    findAll: jest.fn(),
}

const cacheQuery = {
    getOrSet: jest.fn(),
    getOrSetWithProfile: jest.fn((_key: string, _profile: string, factory: () => Promise<any>) => factory()),
    delete: jest.fn(),
    deletePattern: jest.fn(),
    clear: jest.fn(),
}

const makeEducationDTO = (overrides = {}) => ({
    id: 1,
    degreeName: 'B.Sc. Computer Science',
    instituteName: 'State University',
    instituteUrl: 'https://university.edu',
    startedAt: '2018-09-01T00:00:00.000Z',
    endedAt: '2022-06-01T00:00:00.000Z',
    isCompleted: true,
    ...overrides,
})

describe('GetEducationQuery', () => {
    let query: GetEducationQuery

    beforeEach(() => {
        jest.clearAllMocks()
        cacheQuery.getOrSetWithProfile.mockImplementation(
            (_key: string, _profile: string, factory: () => Promise<any>) => factory(),
        )
        repo.findAll.mockResolvedValue([makeEducationDTO()])

        query = new GetEducationQuery(repo, cacheQuery)
    })

    it('returns the education records exactly as provided by the repository', async () => {
        const result = await query.execute()

        expect(result).toEqual([makeEducationDTO()])
    })

    it('uses the LONG cache profile under the education:list:public key', async () => {
        await query.execute()

        expect(cacheQuery.getOrSetWithProfile).toHaveBeenCalledWith(
            'education:list:public',
            'LONG',
            expect.any(Function),
        )
    })

    it('returns an empty array when there are no education records', async () => {
        repo.findAll.mockResolvedValue([])

        const result = await query.execute()

        expect(result).toEqual([])
    })
})
