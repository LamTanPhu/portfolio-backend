import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
// Corrected path — file lives in analytics/, not resume/
import { ResumeDownload } from '../../../domain/entities/ResumeDownload'
import { IResumeDownloadRepository } from '../../../domain/repositories/resume/IResumeDownloadRepository';

// =============================================================================
// PrismaResumeDownloadRepository
// Write-mostly — logs every resume PDF download for analytics.
// No domain logic — pure persistence.
// =============================================================================
@Injectable()
export class PrismaResumeDownloadRepository implements IResumeDownloadRepository {
    constructor(private readonly prisma: PrismaService) {}

    async save(data: { ipAddress: string; browserInfo: string | null }): Promise<void> {
        await this.prisma.client.resumeDownload.create({
            data: {
                ipAddress:   data.ipAddress,
                browserInfo: data.browserInfo,
                // downloadedAt set by database default
            },
        })
    }

    async findAll(): Promise<ResumeDownload[]> {
        const rows = await this.prisma.client.resumeDownload.findMany({
            orderBy: { downloadedAt: 'desc' },
        })
        return rows.map(
            (r) => new ResumeDownload(r.id, r.ipAddress, r.browserInfo, r.downloadedAt),
        )
    }
}