/**
 * @fileoverview DataRetentionTask
 *
 * One scheduled job, three independent cleanups — kept in a single task
 * rather than three separate @Cron methods so the app has two cron jobs
 * total (this + TokenCleanupTask), not four. Each cleanup is wrapped in
 * its own try/catch: one resource failing to clean up must never block
 * the other two, same principle as TokenCleanupTask's error handling.
 *
 * Runs at 3 AM — offset from TokenCleanupTask's 2 AM run so the two never
 * overlap on the same connection pool slot.
 *
 * Retention windows (deliberately short — this data is either short-lived
 * by nature or genuinely doesn't need to be kept longer):
 *   - ContactMe:       7 days  — you'll have read/replied well before this.
 *   - ResumeDownload:  14 days — long enough to review who's looked recently.
 *   - AuditLog:        47 days — see schema.prisma comment; this is a
 *                                recent-activity trail, not a permanent
 *                                accountability record.
 */

import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import type { IContactWriteRepository } from '../../../domain/repositories/contact/IContactWriteRepository'
import type { IResumeDownloadRepository } from '../../../domain/repositories/resume/IResumeDownloadRepository'
import type { IAuditLogWriteRepository } from '../../../domain/repositories/audit/IAuditLogWriteRepository'

const CONTACT_RETENTION_DAYS  = 7
const RESUME_RETENTION_DAYS   = 14
const AUDIT_LOG_RETENTION_DAYS = 47

function daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

@Injectable()
export class DataRetentionTask {
    private readonly logger = new Logger(DataRetentionTask.name)

    constructor(
        @Inject('IContactWriteRepository')
        private readonly contactRepo: IContactWriteRepository,

        @Inject('IResumeDownloadRepository')
        private readonly resumeRepo: IResumeDownloadRepository,

        @Inject('IAuditLogWriteRepository')
        private readonly auditLogRepo: IAuditLogWriteRepository,
    ) {}

    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async handleDataRetention(): Promise<void> {
        this.logger.log('Starting data retention cleanup...')

        await this.cleanup('contact messages', CONTACT_RETENTION_DAYS, (cutoff) =>
            this.contactRepo.deleteOlderThan(cutoff),
        )

        await this.cleanup('resume downloads', RESUME_RETENTION_DAYS, (cutoff) =>
            this.resumeRepo.deleteOlderThan(cutoff),
        )

        await this.cleanup('audit logs', AUDIT_LOG_RETENTION_DAYS, (cutoff) =>
            this.auditLogRepo.deleteOlderThan(cutoff),
        )

        this.logger.log('Data retention cleanup complete')
    }

    // Each resource cleaned up independently — one failing must not stop
    // the others, and must not crash the app (same contract as
    // TokenCleanupTask.handleTokenCleanup()).
    private async cleanup(
        label: string,
        retentionDays: number,
        run: (cutoff: Date) => Promise<void>,
    ): Promise<void> {
        try {
            await run(daysAgo(retentionDays))
            this.logger.log(`Purged ${label} older than ${retentionDays} days`)
        } catch (error) {
            this.logger.error(
                `Retention cleanup failed for ${label}: ${(error as Error).message}`,
                (error as Error).stack,
            )
        }
    }
}
