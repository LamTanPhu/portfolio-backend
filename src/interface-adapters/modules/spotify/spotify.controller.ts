import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { SkipThrottle } from '@nestjs/throttler'
import { GetNowPlayingQuery } from '../../../application/use-cases/queries/analytics/GetNowPlayingQuery'
import type { TrackDTO } from '../../../application/dtos/TrackDTO'

// =============================================================================
// SpotifyController
// Serves cached Spotify now-playing data.
// @SkipThrottle — frontend polls this every 10-30 seconds legitimately.
// Global throttle would block valid polling — skipped here intentionally.
// Spotify API rate limiting handled by SpotifyService cache (30s TTL).
// =============================================================================
@ApiTags('Spotify')
@Controller('spotify')
export class SpotifyController {
  constructor(private readonly query: GetNowPlayingQuery) {}

  @Get('now-playing')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get currently playing Spotify track — cached 30 seconds' })
  @ApiResponse({ status: 200, description: 'Now playing track data — empty strings if nothing playing' })
  async nowPlaying(): Promise<TrackDTO> {
    return this.query.execute()
  }
}