/**
 * @fileoverview PrismaHealthCheckService
 *
 * Infrastructure implementation of IHealthCheckService.
 *
 * Uses a plain `SELECT 1` rather than terminus's own PrismaHealthIndicator
 * (which pings via $runCommandRaw, falling back to $queryRawUnsafe) — this
 * app is Postgres-only, never MongoDB, so that fallback branch is dead
 * weight here. `SELECT 1` also mirrors the exact same connectivity check
 * PrismaService.onModuleInit() already runs on startup — one pattern for
 * "is Postgres actually there", not two.
 */

import { Injectable, Logger } from '@nestjs/common'
import type { IHealthCheckService } from '../../application/ports/IHealthCheckService'
import { PrismaService } from '../database/prisma/prisma.service'

@Injectable()
export class PrismaHealthCheckService implements IHealthCheckService {
    private readonly logger = new Logger(PrismaHealthCheckService.name)

    constructor(private readonly prisma: PrismaService) {}

    async checkDatabase(): Promise<boolean> {
        try {
            await this.prisma.client.$queryRaw`SELECT 1`
            return true
        } catch (error) {
            this.logger.error('Health check: database ping failed', error)
            return false
        }
    }
}
