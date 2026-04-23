import { Injectable, Inject } from '@nestjs/common'
import type { ISpotifyService } from '../../../ports/ISpotifyService'
import type { TrackDTO } from '../../../dtos/TrackDTO'

// =============================================================================
// GetNowPlayingQuery
// Returns currently playing Spotify track.
// Data served from cache — SpotifyService caches for 30 seconds.
// Never hits Spotify API directly — cache miss handled in infrastructure.
// =============================================================================
@Injectable()
export class GetNowPlayingQuery {
  constructor(
    @Inject('ISpotifyService')
    private readonly spotify: ISpotifyService,
  ) {}

  async execute(): Promise<TrackDTO> {
    return this.spotify.getNowPlaying()
  }
}