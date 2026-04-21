export interface TrackData {
  isPlaying: boolean
  title: string
  artist: string
  albumArt: string
  songUrl: string
}

export interface ISpotifyService {
  getNowPlaying(): Promise<TrackData>
}
