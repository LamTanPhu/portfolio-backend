import { Module } from '@nestjs/common'
import { GetNowPlayingQuery } from '../../../application/use-cases/queries/analytics/GetNowPlayingQuery'
import { SpotifyService } from '../../../infrastructure/spotify/SpotifyService'
import { SpotifyController } from './spotify.controller'

@Module({
    controllers: [SpotifyController],
    providers: [
        SpotifyService,
        { provide: 'ISpotifyService', useExisting: SpotifyService },
        {
        provide: GetNowPlayingQuery,
        useFactory: (spotify: SpotifyService) => new GetNowPlayingQuery(spotify),
        inject: [SpotifyService],
        },
    ],
})
export class SpotifyModule {}