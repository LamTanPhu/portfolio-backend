/**
 * @fileoverview GetUserProfileQuery Unit Tests
 */

import { GetUserProfileQuery } from './GetUserProfileQuery'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'

const repo = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
}

const cacheQuery = {
    getOrSet: jest.fn(),
    getOrSetWithProfile: jest.fn((_key: string, _profile: string, factory: () => Promise<any>) => factory()),
    delete: jest.fn(),
    deletePattern: jest.fn(),
    clear: jest.fn(),
}

const makeUser = (overrides = {}) => ({
    id: 1,
    firstname: 'Jane',
    lastname: 'Doe',
    email: 'jane@example.com',
    aboutme: 'Backend engineer.',
    lastLogin: new Date('2026-01-01T00:00:00.000Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

describe('GetUserProfileQuery', () => {
    let query: GetUserProfileQuery

    beforeEach(() => {
        jest.clearAllMocks()
        cacheQuery.getOrSetWithProfile.mockImplementation(
            (_key: string, _profile: string, factory: () => Promise<any>) => factory(),
        )
        repo.findById.mockResolvedValue(makeUser())

        query = new GetUserProfileQuery(repo, cacheQuery)
    })

    it('maps the user entity to a UserProfileDTO with an ISO lastLogin string', async () => {
        const result = await query.execute(1)

        expect(result).toEqual({
            id: 1,
            firstname: 'Jane',
            lastname: 'Doe',
            email: 'jane@example.com',
            aboutme: 'Backend engineer.',
            lastLogin: '2026-01-01T00:00:00.000Z',
        })
    })

    it('never includes hashPassword — the domain User entity has no such field', async () => {
        const result = await query.execute(1)

        expect(result).not.toHaveProperty('hashPassword')
    })

    it('uses the LONG cache profile under a per-user key', async () => {
        await query.execute(1)

        expect(cacheQuery.getOrSetWithProfile).toHaveBeenCalledWith('user:profile:1', 'LONG', expect.any(Function))
    })

    it('returns lastLogin: null when the user has never logged in', async () => {
        repo.findById.mockResolvedValue(makeUser({ lastLogin: null }))

        const result = await query.execute(1)

        expect(result.lastLogin).toBeNull()
    })

    it('throws NotFoundError when no user matches the id', async () => {
        repo.findById.mockResolvedValue(null)

        await expect(query.execute(999)).rejects.toThrow(NotFoundError)
    })
})
