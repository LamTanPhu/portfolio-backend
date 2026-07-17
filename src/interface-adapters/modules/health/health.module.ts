/**
 * @fileoverview HealthModule
 *
 * PrismaService isn't imported explicitly here — PrismaModule is @Global()
 * (see prisma.module.ts), so it's already available application-wide, and
 * PrismaHealthCheckService picks it up the same way any other repository
 * class does.
 */

import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { CheckSystemHealthQuery } from '../../../application/use-cases/queries/health/CheckSystemHealthQuery'
import { PrismaHealthCheckService } from '../../../infrastructure/health/PrismaHealthCheckService'
import { HealthController } from './health.controller'

@Module({
    imports:     [TerminusModule],
    controllers: [HealthController],
    providers: [
        CheckSystemHealthQuery,
        PrismaHealthCheckService,
        { provide: 'IHealthCheckService', useExisting: PrismaHealthCheckService },
    ],
})
export class HealthModule {}