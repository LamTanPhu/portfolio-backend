import { Injectable, Inject } from '@nestjs/common'
import type { IResumeDownloadRepository } from '../../../../domain/repositories/resume/IResumeDownloadRepository'

// =============================================================================
// TrackResumeDownloadCommand
// Logs a resume PDF download event for analytics.
// Write-only — no read path, no return value.
// browserInfo null-safe — not all clients send User-Agent headers.
// =============================================================================
@Injectable()
export class TrackResumeDownloadCommand {
    constructor(
        @Inject('IResumeDownloadRepository')
        private readonly repo: IResumeDownloadRepository,
    ) {}

    async execute(ipAddress: string, browserInfo: string | null): Promise<void> {
        await this.repo.save({ ipAddress, browserInfo })
    }
}