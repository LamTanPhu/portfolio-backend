/**
 * @fileoverview GetCertificationsQuery Unit Tests
 *
 * Repository already returns DTOs directly (see ICertificationReadRepository)
 * — this query is a thin cache wrapper with no mapping of its own.
 */

import { GetCertificationsQuery } from './GetCertificationsQuery'

const repo = {
    findPublished: jest.fn(),
}

const cacheQuery = {
    getOrSet: jest.fn(),
    getOrSetWithProfile: jest.fn((_key: string, _profile: string, factory: () => Promise<any>) => factory()),
    delete: jest.fn(),
    deletePattern: jest.fn(),
    clear: jest.fn(),
}

const makeCertificationDTO = (overrides = {}) => ({
    id: 1,
    name: 'AWS Certified Solutions Architect',
    url: 'https://aws.amazon.com/verify/abc123',
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2028-01-01T00:00:00.000Z',
    ...overrides,
})

describe('GetCertificationsQuery', () => {
    let query: GetCertificationsQuery

    beforeEach(() => {
        jest.clearAllMocks()
        cacheQuery.getOrSetWithProfile.mockImplementation(
            (_key: string, _profile: string, factory: () => Promise<any>) => factory(),
        )
        repo.findPublished.mockResolvedValue([makeCertificationDTO()])

        query = new GetCertificationsQuery(repo, cacheQuery)
    })

    it('returns the certifications exactly as provided by the repository', async () => {
        const result = await query.execute()

        expect(result).toEqual([makeCertificationDTO()])
    })

    it('uses the LONG cache profile under the certification:list:public key', async () => {
        await query.execute()

        expect(cacheQuery.getOrSetWithProfile).toHaveBeenCalledWith(
            'certification:list:public',
            'LONG',
            expect.any(Function),
        )
    })

    it('returns an empty array when there are no published certifications', async () => {
        repo.findPublished.mockResolvedValue([])

        const result = await query.execute()

        expect(result).toEqual([])
    })
})
