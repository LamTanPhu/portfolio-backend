/**
 * @fileoverview GetPublicSocialAccountsQuery Unit Tests
 *
 * Repository already returns DTOs directly (see ISocialAccountReadRepository)
 * — this query is a thin cache wrapper with no mapping of its own.
 */

import { GetPublicSocialAccountsQuery } from './GetPublicSocialAccountsQuery'

const repo = {
    findPublic: jest.fn(),
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

const makeAccountDTO = (overrides = {}) => ({
    id: 1,
    name: 'GitHub',
    url: 'https://github.com/me',
    imageUrl: 'https://cdn.example.com/github.svg',
    isPublic: true,
    ...overrides,
})

describe('GetPublicSocialAccountsQuery', () => {
    let query: GetPublicSocialAccountsQuery

    beforeEach(() => {
        jest.clearAllMocks()
        cacheQuery.getOrSetWithProfile.mockImplementation(
            (_key: string, _profile: string, factory: () => Promise<any>) => factory(),
        )
        repo.findPublic.mockResolvedValue([makeAccountDTO()])

        query = new GetPublicSocialAccountsQuery(repo, cacheQuery)
    })

    it('returns the social accounts exactly as provided by the repository', async () => {
        const result = await query.execute()

        expect(result).toEqual([makeAccountDTO()])
    })

    it('uses the LONG cache profile under the social:list:public key', async () => {
        await query.execute()

        expect(cacheQuery.getOrSetWithProfile).toHaveBeenCalledWith('social:list:public', 'LONG', expect.any(Function))
    })

    it('calls repo.findPublic, not findAll — private accounts must never appear here', async () => {
        await query.execute()

        expect(repo.findPublic).toHaveBeenCalledTimes(1)
        expect(repo.findAll).not.toHaveBeenCalled()
    })

    it('returns an empty array when there are no public accounts', async () => {
        repo.findPublic.mockResolvedValue([])

        const result = await query.execute()

        expect(result).toEqual([])
    })
})
