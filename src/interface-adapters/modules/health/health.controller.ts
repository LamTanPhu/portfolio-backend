/**
 * @fileoverview HealthController
 *
 * Liveness + readiness probe for load balancers, container orchestrators
 * (Docker/Kubernetes), and uptime monitors.
 *
 * Deliberately public — no JwtAuthGuard. An infra health check has no JWT
 * to present, and a probe endpoint that requires auth to tell you the app
 * is up defeats its own purpose.
 *
 * Returns 200 when the app process is up AND the database is reachable,
 * 503 otherwise — @HealthCheck() handles that status-code mapping
 * automatically based on the up()/down() result returned below.
 *
 * Layering: this controller depends on CheckSystemHealthQuery (application
 * layer), not on Prisma or PrismaHealthIndicator directly — same
 * Controller -> Query -> Port shape every other controller in this app
 * uses. HealthCheckService/HealthIndicatorService (terminus) stay here
 * because shaping "is it healthy" into an HTTP status code and response
 * body IS an interface-adapter concern — deciding whether the database is
 * actually reachable is not, and that logic now lives behind
 * IHealthCheckService instead.
 */

import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { HealthCheck, HealthCheckService, HealthIndicatorService } from '@nestjs/terminus'
import { CheckSystemHealthQuery } from '../../../application/use-cases/queries/health/CheckSystemHealthQuery'

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(
        private readonly health:                  HealthCheckService,
        private readonly healthIndicatorService:   HealthIndicatorService,
        private readonly checkSystemHealthQuery:   CheckSystemHealthQuery,
    ) {}

    @Get()
    @HealthCheck()
    @ApiOperation({ summary: 'Liveness + readiness check (public, unauthenticated)' })
    @ApiResponse({ status: 200, description: 'App is up and the database is reachable' })
    @ApiResponse({ status: 503, description: 'App is up but the database is not reachable' })
    check() {
        return this.health.check([
            async () => {
                const indicator = this.healthIndicatorService.check('database')
                const { isDatabaseHealthy } = await this.checkSystemHealthQuery.execute()
                return isDatabaseHealthy ? indicator.up() : indicator.down()
            },
        ])
    }
}