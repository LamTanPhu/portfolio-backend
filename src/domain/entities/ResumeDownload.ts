// =============================================================================
// ResumeDownload
// Write-only analytics — tracks resume PDF download events.
// browserInfo null-safe — not all clients send User-Agent headers.
// =============================================================================
export class ResumeDownload {
    constructor(
        public readonly id:          number,
        public readonly ipAddress:   string,
        public readonly browserInfo: string | null,
        public readonly downloadedAt: Date,
    ) {}
}