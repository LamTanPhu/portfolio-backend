/**
 * @fileoverview GetPageViewsQuery Unit Tests
 *
 * Admin-only, uncached query. Verifies the Date -> ISO string mapping
 * (domain Date objects must never cross into the DTO layer) and that
 * ordering/filtering is left entirely to the repository.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { GetPageViewsQuery } from './GetPageViewsQuery'

const mockRepo = {
    findAll: jest.fn(),
    findByRoute: jest.fn(),
    increment: jest.fn(),
}

const makePageView = (overrides = {}) => ({
    route: '/blog/my-post',
    count: 42,
    lastViewedAt: new Date('2026-02-01T12:00:00.000Z'),
    ...overrides,
})

describe('GetPageViewsQuery', () => {
    let query: GetPageViewsQuery

    beforeEach(async () => {
        jest.clearAllMocks()
        mockRepo.findAll.mockResolvedValue([makePageView()])

        const module: TestingModule = await Test.createTestingModule({
            providers: [GetPageViewsQuery, { provide: 'IPageViewRepository', useValue: mockRepo }],
        }).compile()

        query = module.get<GetPageViewsQuery>(GetPageViewsQuery)
    })

    it('maps repository entries to PageViewDTOs with an ISO lastViewedAt string', async () => {
        const result = await query.execute()

        expect(result).toEqual([
            {
                route: '/blog/my-post',
                count: 42,
                lastViewedAt: '2026-02-01T12:00:00.000Z',
            },
        ])
    })

    it('preserves the order returned by the repository (count descending)', async () => {
        mockRepo.findAll.mockResolvedValue([
            makePageView({ route: '/', count: 100 }),
            makePageView({ route: '/about', count: 10 }),
        ])

        const result = await query.execute()

        expect(result.map((r) => r.route)).toEqual(['/', '/about'])
    })

    it('returns an empty array when there is no view data yet', async () => {
        mockRepo.findAll.mockResolvedValue([])

        const result = await query.execute()

        expect(result).toEqual([])
    })

    it('propagates an error if the repository throws', async () => {
        mockRepo.findAll.mockRejectedValue(new Error('db down'))

        await expect(query.execute()).rejects.toThrow('db down')
    })
})
