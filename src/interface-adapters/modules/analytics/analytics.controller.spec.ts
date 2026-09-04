/**
 * @fileoverview AnalyticsController Unit Tests
 *
 * Covers the controller's own logic — request parsing, ip/user-agent
 * truncation before hitting the DB column limits, and guard wiring —
 * while the tracking commands and GetPageViewsQuery are exercised in
 * their own unit tests.
 */

import { GUARDS_METADATA } from '@nestjs/common/constants'
import { Test, TestingModule } from '@nestjs/testing'
import type { Request } from 'express'
import { AnalyticsController } from './analytics.controller'
import { TrackPageViewCommand } from '../../../application/use-cases/commands/analytics/TrackPageViewCommand'
import { TrackProjectViewCommand } from '../../../application/use-cases/commands/analytics/TrackProjectViewCommand'
import { TrackResumeDownloadCommand } from '../../../application/use-cases/commands/analytics/TrackResumeDownloadCommand'
import { GetPageViewsQuery } from '../../../application/use-cases/queries/analytics/GetPageViewsQuery'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'

const mockTrackPageView = { execute: jest.fn() }
const mockTrackResumeDownload = { execute: jest.fn() }
const mockTrackProjectView = { execute: jest.fn() }
const mockGetPageViewsQuery = { execute: jest.fn() }

const makeRequest = (overrides: Partial<Request> = {}): Request =>
    ({
        ip: '203.0.113.5',
        headers: { 'user-agent': 'Mozilla/5.0' },
        ...overrides,
    }) as Request

describe('AnalyticsController', () => {
    let controller: AnalyticsController

    beforeEach(async () => {
        jest.clearAllMocks()
        mockTrackPageView.execute.mockResolvedValue(undefined)
        mockTrackResumeDownload.execute.mockResolvedValue(undefined)
        mockTrackProjectView.execute.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AnalyticsController],
            providers: [
                { provide: GetPageViewsQuery, useValue: mockGetPageViewsQuery },
                { provide: TrackPageViewCommand, useValue: mockTrackPageView },
                { provide: TrackResumeDownloadCommand, useValue: mockTrackResumeDownload },
                { provide: TrackProjectViewCommand, useValue: mockTrackProjectView },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: jest.fn(() => true) })
            .compile()

        controller = module.get<AnalyticsController>(AnalyticsController)
    })

    describe('POST /analytics/page-view', () => {
        it('passes dto.route to TrackPageViewCommand and confirms success', async () => {
            const result = await controller.trackPage({ route: '/blog/my-post' })

            expect(mockTrackPageView.execute).toHaveBeenCalledWith('/blog/my-post')
            expect(result).toEqual({ success: true })
        })
    })

    describe('POST /analytics/project-view/:id', () => {
        it('passes the parsed numeric id to TrackProjectViewCommand', async () => {
            const result = await controller.trackProject(42)

            expect(mockTrackProjectView.execute).toHaveBeenCalledWith(42)
            expect(result).toEqual({ success: true })
        })
    })

    describe('POST /analytics/resume-download', () => {
        it('extracts ip and user-agent from the request and forwards them', async () => {
            const result = await controller.trackResume(makeRequest())

            expect(mockTrackResumeDownload.execute).toHaveBeenCalledWith('203.0.113.5', 'Mozilla/5.0')
            expect(result).toEqual({ success: true })
        })

        it('truncates the ip address to 45 chars (VARCHAR(45) column limit)', async () => {
            const longIp = 'x'.repeat(100)

            await controller.trackResume(makeRequest({ ip: longIp }))

            expect(mockTrackResumeDownload.execute).toHaveBeenCalledWith('x'.repeat(45), 'Mozilla/5.0')
        })

        it('truncates the user-agent to 500 chars', async () => {
            const longUA = 'y'.repeat(1000)

            await controller.trackResume(makeRequest({ headers: { 'user-agent': longUA } }))

            expect(mockTrackResumeDownload.execute).toHaveBeenCalledWith('203.0.113.5', 'y'.repeat(500))
        })

        it('passes null browserInfo when there is no User-Agent header', async () => {
            await controller.trackResume(makeRequest({ headers: {} }))

            expect(mockTrackResumeDownload.execute).toHaveBeenCalledWith('203.0.113.5', null)
        })

        it('passes an empty string ip rather than undefined when req.ip is missing', async () => {
            await controller.trackResume(makeRequest({ ip: undefined }))

            expect(mockTrackResumeDownload.execute).toHaveBeenCalledWith('', 'Mozilla/5.0')
        })
    })

    describe('GET /analytics/page-views', () => {
        it('is protected by JwtAuthGuard — admin only', () => {
            // eslint-disable-next-line @typescript-eslint/unbound-method -- reading Nest's route-guard metadata off the unbound method reference is intentional
            const guards = Reflect.getMetadata(GUARDS_METADATA, AnalyticsController.prototype.getPageViews) as
                | unknown[]
                | undefined

            expect(guards).toContain(JwtAuthGuard)
        })

        it('delegates to GetPageViewsQuery and returns its result', async () => {
            const stats = [{ route: '/', count: 100, lastViewedAt: '2026-01-01T00:00:00.000Z' }]
            mockGetPageViewsQuery.execute.mockResolvedValue(stats)

            const result = await controller.getPageViews()

            expect(result).toBe(stats)
        })
    })
})
