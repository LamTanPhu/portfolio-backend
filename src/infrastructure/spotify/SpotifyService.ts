import { Injectable } from '@nestjs/common'
import { ISpotifyService, TrackData } from '../../application/ports/ISpotifyService'

@Injectable()
export class SpotifyService implements ISpotifyService {
  private readonly clientId = process.env.SPOTIFY_CLIENT_ID ?? ''
  private readonly clientSecret = process.env.SPOTIFY_CLIENT_SECRET ?? ''
  private readonly refreshToken = process.env.SPOTIFY_REFRESH_TOKEN ?? ''

  private async getAccessToken(): Promise<string> {
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
      }),
    })
    const data = await res.json() as { access_token: string }
    return data.access_token
  }

  async getNowPlaying(): Promise<TrackData> {
    const token = await this.getAccessToken()
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.status === 204) {
      return { isPlaying: false, title: '', artist: '', albumArt: '', songUrl: '' }
    }

    const data = await res.json() as any
    return {
      isPlaying: data.is_playing,
      title: data.item?.name ?? '',
      artist: data.item?.artists?.map((a: any) => a.name).join(', ') ?? '',
      albumArt: data.item?.album?.images?.[0]?.url ?? '',
      songUrl: data.item?.external_urls?.spotify ?? '',
    }
  }
}