import { Injectable, Logger, Inject } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import type { ITokenRepository } from '../../../application/ports/ITokenRepository'

@Injectable()
export class TokenCleanupTask {
    private readonly logger = new Logger(TokenCleanupTask.name)

    constructor(
        @Inject('ITokenRepository')
        private readonly revokedTokenRepo: ITokenRepository,
    ) {}

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
