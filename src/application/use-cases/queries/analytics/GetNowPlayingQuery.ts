import { Injectable, Inject } from '@nestjs/common'
import type { ISpotifyService } from '../../../ports/ISpotifyService'
import type { TrackDTO } from '../../../dtos/TrackDTO'

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