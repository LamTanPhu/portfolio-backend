/**
 * @fileoverview SpotifyController Unit Tests
 *
 * Single-endpoint pass-through to GetNowPlayingQuery. The 30-second cache
 * and Spotify API details live behind that query and have their own tests.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { SpotifyController } from './spotify.controller'
import { GetNowPlayingQuery } from '../../../application/use-cases/queries/analytics/GetNowPlayingQuery'

const mockQuery = { execute: jest.fn() }

describe('SpotifyController', () => {
    let controller: SpotifyController

    beforeEach(async () => {
        jest.clearAllMocks()

        const module: TestingModule = await Test.createTestingModule({
            controllers: [SpotifyController],
            providers: [{ provide: GetNowPlayingQuery, useValue: mockQuery }],
        }).compile()

        controller = module.get<SpotifyController>(SpotifyController)
    })

    it('GET /spotify/now-playing delegates to GetNowPlayingQuery with no args', async () => {
        const track = { isPlaying: true, title: 'Song', artist: 'Artist', albumArtUrl: null, songUrl: null }
        mockQuery.execute.mockResolvedValue(track)

        const result = await controller.nowPlaying()

        expect(mockQuery.execute).toHaveBeenCalledWith()
        expect(result).toBe(track)
    })

    it('propagates an error if the query throws', async () => {
        mockQuery.execute.mockRejectedValue(new Error('spotify unavailable'))

        await expect(controller.nowPlaying()).rejects.toThrow('spotify unavailable')
    })
})
