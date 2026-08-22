import type { ResumeDownload } from '../../entities/ResumeDownload'

// =============================================================================
// IResumeDownloadRepository
// Write-mostly — logs resume PDF download events for analytics.
// findAll used by admin endpoints — never exposed publicly.
// browserInfo null-safe — not all clients send User-Agent headers.
// =============================================================================
export interface IResumeDownloadRepository {
    save(data: { ipAddress: string; browserInfo: string | null }): Promise<void>
    findAll(): Promise<ResumeDownload[]>

    /** Deletes every row with downloadedAt older than `cutoff`. Used by DataRetentionTask. */
    deleteOlderThan(cutoff: Date): Promise<void>
}
