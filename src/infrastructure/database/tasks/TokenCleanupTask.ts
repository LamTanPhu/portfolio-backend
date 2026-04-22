import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaRevokedTokenRepository } from '../repositories/PrismaRevokedTokenRepository'

// =============================================================================
// TokenCleanupTask
// Scheduled task — runs daily at 2am UTC.
// Deletes expired revoked tokens — prevents table growing unbounded.
// Batched deletion in repository — no table lock risk.
// =============================================================================
@Injectable()
export class TokenCleanupTask {
    private readonly logger = new Logger(TokenCleanupTask.name)

    constructor(
        private readonly revokedTokenRepo: PrismaRevokedTokenRepository,
    ) {}

    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async handleTokenCleanup(): Promise<void> {
        this.logger.log('Running expired token cleanup...')
        await this.revokedTokenRepo.deleteExpired()
        this.logger.log('Expired token cleanup complete')
    }
}