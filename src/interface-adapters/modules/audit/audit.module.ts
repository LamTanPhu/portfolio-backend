/**
 * @fileoverview AuditModule
 *
 * Wires the recent-activity trail: admin read endpoint, repository, and the
 * write-side port that both AuditLogInterceptor (root-level, see AppModule)
 * and DataRetentionTask depend on.
 *
 * 'IAuditLogWriteRepository' is exported specifically so those two root-level
 * providers can inject it — same pattern AuthModule uses to expose
 * 'ITokenRepository' to TokenCleanupTask.
 */

import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'

import { AuditController } from './audit.controller'
import { GetAuditLogsQuery } from '../../../application/use-cases/queries/audit/GetAuditLogsQuery'
import { PrismaAuditLogRepository } from '../../../infrastructure/database/repositories/audit/PrismaAuditLogRepository'
import { NestLogger } from '../../../infrastructure/logging/NestLogger'

@Module({
    imports: [AuthModule],

    controllers: [AuditController],

    providers: [
        PrismaAuditLogRepository,
        NestLogger,

        { provide: 'IAuditLogWriteRepository', useExisting: PrismaAuditLogRepository },
        { provide: 'IAuditLogReadRepository', useExisting: PrismaAuditLogRepository },
        { provide: 'ILogger', useExisting: NestLogger },

        GetAuditLogsQuery,
    ],

    exports: [
        { provide: 'IAuditLogWriteRepository', useExisting: PrismaAuditLogRepository },
        { provide: 'ILogger', useExisting: NestLogger },
    ],
})
export class AuditModule {}
