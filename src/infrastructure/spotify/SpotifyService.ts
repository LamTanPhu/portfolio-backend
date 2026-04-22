import { Injectable, Logger } from '@nestjs/common'
import type { ISpotifyService, TrackData } from '../../application/ports/ISpotifyService'

// =============================================================================
// Spotify API response types
// Typed explicitly — zero any, compile-time safety on API shape
// =============================================================================
interface SpotifyTokenResponse {
  access_token: string
  expires_in:   number
}

interface SpotifyArtist {
  name: string
}

interface SpotifyImage {
  url: string
}

interface SpotifyTrack {
  name:             string
  artists:          SpotifyArtist[]
  album:            { images: SpotifyImage[] }
  external_urls:    { spotify: string }
}

interface SpotifyNowPlayingResponse {
  is_playing: boolean
  item:       SpotifyTrack | null
}

// =============================================================================
// Cache entry shape
// =============================================================================
interface CachedToken {
  value:     string
  expiresAt: number  // Unix ms timestamp
}

interface CachedTrack {
  data:      TrackData
  expiresAt: number  // Unix ms timestamp
}

// =============================================================================
// SpotifyService
// In-memory cache for both access token and now-playing response.
//
// Access token cache:
//   Spotify tokens are valid for 3600 seconds (1 hour).
//   We cache for 55 minutes — 5 minute buffer before expiry.
//   Eliminates redundant /api/token calls on every request.
//
// Now-playing cache:
//   Frontend polls this endpoint frequently (e.g. every 10 seconds).
//   We cache for 30 seconds — responsive enough, not hammering Spotify.
//   On cache miss: fetch fresh data and repopulate.
//
// Result: N frontend polls → 1 Spotify API call per 30s instead of N calls.
// =============================================================================
@Injectable()
export class SpotifyService implements ISpotifyService {
  private readonly logger = new Logger(SpotifyService.name)

  // Cache TTLs in milliseconds
  private static readonly TOKEN_CACHE_TTL_MS = 55 * 60 * 1_000  // 55 minutes
  private static readonly TRACK_CACHE_TTL_MS = 30 * 1_000        // 30 seconds

  // In-memory cache — reset on server restart, which is acceptable
  private tokenCache: CachedToken | null = null
  private trackCache: CachedTrack | null = null

  // ===========================================================================
  // Access Token — cached, refreshed only on expiry
  // ===========================================================================
  private async getAccessToken(): Promise<string> {
    const now = Date.now()

    // Return cached token if still valid
    if (this.tokenCache && this.tokenCache.expiresAt > now) {
      return this.tokenCache.value
    }

    const clientId     = process.env.SPOTIFY_CLIENT_ID     ?? ''
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET ?? ''
    const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN ?? ''

    if (!clientId || !clientSecret || !refreshToken) {
      this.logger.warn('Spotify credentials not configured — skipping token fetch')
      return ''
    }

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method:  'POST',
      headers: {
        Authorization:  `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!res.ok) {
      this.logger.error(`Spotify token fetch failed: ${res.status}`)
      return ''
    }

    const data = await res.json() as SpotifyTokenResponse

    // Cache token for 55 minutes — 5 min buffer before Spotify's 1hr expiry
    this.tokenCache = {
      value:     data.access_token,
      expiresAt: now + SpotifyService.TOKEN_CACHE_TTL_MS,
    }

    this.logger.log('Spotify access token refreshed and cached')
    return data.access_token
  }

  // ===========================================================================
  // getNowPlaying — cached for 30 seconds
  // Cache hit: O(1) — returns in-memory data, zero network calls
  // Cache miss: two sequential fetches (token + now-playing)
  // ===========================================================================
  async getNowPlaying(): Promise<TrackData> {
    const now = Date.now()

    // Return cached track if still fresh
    if (this.trackCache && this.trackCache.expiresAt > now) {
      return this.trackCache.data
    }

    const token = await this.getAccessToken()

    // If credentials missing — return silent fallback, never throw
    if (!token) {
      return { isPlaying: false, title: '', artist: '', albumArt: '', songUrl: '' }
    }

    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` },
    })

    // 204 = nothing currently playing
    if (res.status === 204) {
      const data: TrackData = {
        isPlaying: false,
        title:     '',
        artist:    '',
        albumArt:  '',
        songUrl:   '',
      }
      this.trackCache = { data, expiresAt: now + SpotifyService.TRACK_CACHE_TTL_MS }
      return data
    }

    if (!res.ok) {
      this.logger.error(`Spotify now-playing fetch failed: ${res.status}`)
      return { isPlaying: false, title: '', artist: '', albumArt: '', songUrl: '' }
    }

    const raw = await res.json() as SpotifyNowPlayingResponse

    const data: TrackData = {
      isPlaying: raw.is_playing,
      title:     raw.item?.name ?? '',
      artist:    raw.item?.artists.map((a) => a.name).join(', ') ?? '',
      albumArt:  raw.item?.album.images[0]?.url ?? '',
      songUrl:   raw.item?.external_urls.spotify ?? '',
    }

    // Cache for 30 seconds — frontend can poll freely without hammering Spotify
    this.trackCache = { data, expiresAt: now + SpotifyService.TRACK_CACHE_TTL_MS }

    return data
  }
}