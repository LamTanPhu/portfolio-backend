/**
 * @fileoverview GetNowPlayingQuery Unit Tests
 *
 * This query is a pure pass-through to ISpotifyService — the 30-second
 * caching and Spotify API details live in the infrastructure adapter and
 * have their own test coverage. Here we only prove the delegation is
 * correct and that no extra mapping/caching sneaks in at this layer.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { GetNowPlayingQuery } from './GetNowPlayingQuery'

const mockSpotify = {
    getNowPlaying: jest.fn(),
}

const makeTrack = (overrides = {}) => ({
    isPlaying: true,
    title: 'Song Title',
    artist: 'Artist Name',
    albumArtUrl: 'https://cdn.example.com/album.jpg',
    songUrl: 'https://open.spotify.com/track/abc123',
    ...overrides,
})

describe('GetNowPlayingQuery', () => {
    let query: GetNowPlayingQuery

    beforeEach(async () => {
        jest.clearAllMocks()
        mockSpotify.getNowPlaying.mockResolvedValue(makeTrack())

        const module: TestingModule = await Test.createTestingModule({
            providers: [GetNowPlayingQuery, { provide: 'ISpotifyService', useValue: mockSpotify }],
        }).compile()

        query = module.get<GetNowPlayingQuery>(GetNowPlayingQuery)
    })

    it('returns exactly what the Spotify service provides', async () => {
        const result = await query.execute()

        expect(result).toEqual(makeTrack())
    })

    it('delegates to spotify.getNowPlaying exactly once, with no arguments', async () => {
        await query.execute()

        expect(mockSpotify.getNowPlaying).toHaveBeenCalledTimes(1)
        expect(mockSpotify.getNowPlaying).toHaveBeenCalledWith()
    })

    it('returns isPlaying: false with no track details when nothing is playing', async () => {
        mockSpotify.getNowPlaying.mockResolvedValue({
            isPlaying: false,
            title: null,
            artist: null,
            albumArtUrl: null,
            songUrl: null,
        })

        const result = await query.execute()

        expect(result.isPlaying).toBe(false)
        expect(result.title).toBeNull()
    })

    it('propagates an error if the Spotify service throws', async () => {
        mockSpotify.getNowPlaying.mockRejectedValue(new Error('spotify unavailable'))

        await expect(query.execute()).rejects.toThrow('spotify unavailable')
    })
})
