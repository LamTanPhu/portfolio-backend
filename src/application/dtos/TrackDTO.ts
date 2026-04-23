// =============================================================================
// TrackDTO
// Output shape for Spotify now-playing data.
// Returned from cache — not a domain entity, purely infrastructure DTO.
// All strings empty when nothing is currently playing (isPlaying: false).
// =============================================================================
export interface TrackDTO {
  isPlaying: boolean
  title:     string
  artist:    string
  albumArt:  string
  songUrl:   string
}