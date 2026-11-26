import { Injectable, Logger, Inject, OnApplicationBootstrap } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import type { ITokenRepository } from '../../../application/ports/ITokenRepository'

@Injectable()
export class TokenCleanupTask implements OnApplicationBootstrap {
    private readonly logger = new Logger(TokenCleanupTask.name)

    constructor(
        @Inject('ITokenRepository')
        private readonly revokedTokenRepo: ITokenRepository,
    ) {}

    // Free-tier hosts put the process to sleep when idle, and a sleeping
    // process never fires its 2 AM cron. Running the (idempotent, indexed)
    // cleanup once per boot guarantees it still happens whenever the app wakes.
    // Deliberately NOT awaited: handleTokenCleanup() catches its own errors, and
    // startup must never wait on — or fail because of — housekeeping.
    onApplicationBootstrap(): void {
        void this.handleTokenCleanup()
    }

    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async handleTokenCleanup(): Promise<void> {
        this.logger.log('Starting expired token cleanup...')
        try {
            await this.revokedTokenRepo.deleteExpired()
            this.logger.log('Expired token cleanup complete')
        } catch (error) {
            this.logger.error(`Token cleanup failed: ${(error as Error).message}`, (error as Error).stack)
        }
    }
}
