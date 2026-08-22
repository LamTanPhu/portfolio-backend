/**
 * @fileoverview CheckSystemHealthQuery
 *
 * Application layer — depends only on the IHealthCheckService port, never
 * on Prisma or terminus directly. Same shape as every other Query class in
 * this codebase: thin, framework-agnostic, testable with a mocked port.
 */

import { Inject, Injectable } from '@nestjs/common'
import type { IHealthCheckService } from '../../../ports/IHealthCheckService'

export interface SystemHealthResult {
    isDatabaseHealthy: boolean
}

@Injectable()
export class CheckSystemHealthQuery {
    constructor(
        @Inject('IHealthCheckService')
        private readonly healthCheckService: IHealthCheckService,
    ) {}

    async execute(): Promise<SystemHealthResult> {
        const isDatabaseHealthy = await this.healthCheckService.checkDatabase()
        return { isDatabaseHealthy }
    }
}
