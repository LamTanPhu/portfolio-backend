import { Module } from '@nestjs/common'
import { SpotifyController } from './spotify.controller'
import { GetNowPlayingQuery } from '../../../application/use-cases/queries/analytics/GetNowPlayingQuery'
import { SpotifyService } from '../../../infrastructure/spotify/SpotifyService'

// =============================================================================
// SpotifyModule
// SpotifyService is singleton — in-memory cache lives for process lifetime.
// No AuthModule import — now-playing is a fully public endpoint.
// =============================================================================
@Module({
    controllers: [SpotifyController],
    providers: [
        SpotifyService,
        { provide: 'ISpotifyService', useExisting: SpotifyService },
        {
            provide:    GetNowPlayingQuery,
            useFactory: (spotify: SpotifyService) => new GetNowPlayingQuery(spotify),
            inject:     [SpotifyService],
        },
    ],
})
export class SpotifyModule {}