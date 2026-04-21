import { Controller, Get } from '@nestjs/common'
import { GetNowPlayingQuery } from '../../../application/use-cases/queries/analytics/GetNowPlayingQuery'

@Controller('spotify')
export class SpotifyController {
  constructor(private readonly query: GetNowPlayingQuery) {}

  @Get('now-playing')
  async nowPlaying() {
    return this.query.execute()
  }
}
