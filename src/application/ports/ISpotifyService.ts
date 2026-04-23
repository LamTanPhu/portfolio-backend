// =============================================================================
// ISpotifyService
// Application port for Spotify API integration.
// GetNowPlayingQuery depends on this interface — never on SpotifyService directly.
// Cache strategy lives in infrastructure (SpotifyService) — invisible to use cases.
// =============================================================================
export interface TrackData {
  isPlaying: boolean
  title:     string
  artist:    string
  albumArt:  string
  songUrl:   string
}

export interface ISpotifyService {
  getNowPlaying(): Promise<TrackData>
}