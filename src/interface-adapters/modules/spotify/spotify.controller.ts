import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { GetNowPlayingQuery } from '../../../application/use-cases/queries/analytics/GetNowPlayingQuery'
import type { TrackDTO } from '../../../application/dtos/TrackDTO'

// =============================================================================
// SpotifyController
// Serves cached Spotify now-playing data.
//
// Throttle: 60 requests per minute per IP (one per second).
// This comfortably covers frontend polling every 10–30 seconds while still
// bounding abuse. Previously @SkipThrottle() meant no per-client limit at all
// — an external client could hammer this endpoint without restriction.
// The 30-second SpotifyService cache protects the Spotify API regardless,
// but the NestJS process itself still paid the handler cost on every request.
// =============================================================================
@ApiTags('Spotify')
@Controller('spotify')
export class SpotifyController {
  constructor(private readonly query: GetNowPlayingQuery) {}

  @Get('now-playing')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Get currently playing Spotify track — cached 30 seconds' })
  @ApiResponse({ status: 200, description: 'Now playing track data — empty strings if nothing playing' })
  async nowPlaying(): Promise<TrackDTO> {
    return this.query.execute()
  }
}