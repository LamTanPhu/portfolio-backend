import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { ResumeDownload } from '../../../domain/entities/ResumeDownload'
import { IResumeDownloadRepository } from '../../../domain/repositories/resume/IResumeDownloadRepository';

// =============================================================================
// PrismaResumeDownloadRepository
// Write-mostly — logs every resume PDF download for analytics.
// No domain logic — pure persistence.
// downloadedAt set by database default — never trusted from application layer.
// =============================================================================
@Injectable()
export class PrismaResumeDownloadRepository implements IResumeDownloadRepository {
    constructor(private readonly prisma: PrismaService) {}

    async save(data: { ipAddress: string; browserInfo: string | null }): Promise<void> {
        await this.prisma.client.resumeDownload.create({
        data: {
            ipAddress:   data.ipAddress,
            browserInfo: data.browserInfo,
            // downloadedAt set by DB default — never trust client-provided timestamps
        },
        })
    }

    // Capped at 500 rows — resume downloads are admin-only analytics.
    // A full table scan here would silently degrade as the table grows.
    // 500 recent entries are more than enough for any analytical use.
    async findAll(): Promise<ResumeDownload[]> {
        const rows = await this.prisma.client.resumeDownload.findMany({
            orderBy: { downloadedAt: 'desc' },
            take: 500,
        })
        return rows.map(
            (r) => new ResumeDownload(r.id, r.ipAddress, r.browserInfo, r.downloadedAt),
        )
    }

    // Single deleteMany — table stays tiny at a 14-day retention window,
    // batching (see PrismaRevokedTokenRepository) would be needless complexity.
    // Called on a schedule (daily, via DataRetentionTask) — not on hot path.
    async deleteOlderThan(cutoff: Date): Promise<void> {
        await this.prisma.client.resumeDownload.deleteMany({
            where: { downloadedAt: { lt: cutoff } },
        })
    }
}