import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { SkipThrottle } from '@nestjs/throttler'
import { GetNowPlayingQuery } from '../../../application/use-cases/queries/analytics/GetNowPlayingQuery'

// =============================================================================
// SpotifyController
// Serves cached Spotify now-playing data.
// @SkipThrottle — frontend polls this every 10-30 seconds.
// Global throttle would block legitimate polling — skip it here.
// Cache in SpotifyService handles Spotify API rate limiting instead.
// =============================================================================
@ApiTags('Spotify')
@Controller('spotify')
export class SpotifyController {
  constructor(private readonly query: GetNowPlayingQuery) {}

  @Get('now-playing')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get currently playing Spotify track — cached 30s' })
  @ApiResponse({ status: 200, description: 'Now playing track data or empty if nothing playing' })
  async nowPlaying() {
    return this.query.execute()
  }
}