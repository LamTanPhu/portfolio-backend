import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaRevokedTokenRepository } from '../repositories/PrismaRevokedTokenRepository'

// =============================================================================
// TokenCleanupTask
// Scheduled task — runs daily at 2am UTC.
// Deletes expired revoked tokens to prevent table growing unbounded.
// Batched deletion in PrismaRevokedTokenRepository — no table lock risk.
// Registered in AppModule providers — infrastructure concern, not AuthModule.
// =============================================================================
@Injectable()
export class TokenCleanupTask {
    private readonly logger = new Logger(TokenCleanupTask.name)

    constructor(
        private readonly revokedTokenRepo: PrismaRevokedTokenRepository,
    ) {}

    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async handleTokenCleanup(): Promise<void> {
        this.logger.log('Starting expired token cleanup...')

        try {
        await this.revokedTokenRepo.deleteExpired()
        this.logger.log('Expired token cleanup complete')
        } catch (error) {
        // Log but never throw — cron failure must not crash the application
        this.logger.error(
            `Token cleanup failed: ${(error as Error).message}`,
            (error as Error).stack,
        )
        }
    }
}