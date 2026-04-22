import { Module } from '@nestjs/common'
import { SpotifyController } from './spotify.controller'
import { GetNowPlayingQuery } from '../../../application/use-cases/queries/analytics/GetNowPlayingQuery'
import { SpotifyService } from '../../../infrastructure/spotify/SpotifyService'

// =============================================================================
// SpotifyModule
// SpotifyService is singleton — cache lives for the lifetime of the process.
// No AuthModule import needed — now-playing is a public endpoint.
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