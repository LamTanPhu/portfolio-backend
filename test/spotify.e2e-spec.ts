/**
 * @fileoverview spotify.e2e-spec.ts
 *
 * .env.test deliberately leaves SPOTIFY_CLIENT_ID/SECRET/REFRESH_TOKEN
 * unset. SpotifyService.getAccessToken() already fails-silent with zero
 * network calls in that case (verified by reading the implementation), so
 * this test exercises the real controller → query → service chain without
 * needing to mock anything or reach the actual Spotify API — an offline CI
 * run gets genuine coverage of the "nothing is playing" response shape for free.
 */

import type { INestApplication } from '@nestjs/common'
import type { Server } from 'http'
import { createTestApp } from './utils/create-test-app'
import { api } from './utils/http'

interface Track {
    isPlaying: boolean
    title: string
    artist: string
    albumArt: string
    songUrl: string
}

describe('Spotify (e2e)', () => {
    let app: INestApplication<Server>

    beforeAll(async () => {
        app = await createTestApp()
    })

    afterAll(async () => {
        await app.close()
    })

    it('GET /api/spotify/now-playing returns the empty fallback track with no Spotify credentials configured', async () => {
        const res = await api(app).get('/api/spotify/now-playing').expect(200)
        const body = res.body as Track

        expect(body.isPlaying).toBe(false)
        expect(body.title).toBe('')
        expect(body.artist).toBe('')
    })
})
