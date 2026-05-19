/**
 * @fileoverview CertificationModule
 * 
 * Organizes all Certification-related concerns following Clean Architecture.
 * - Separated Read and Write repositories (as requested)
 * - Proper cache integration
 * - Clear dependency flow
 */

import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { CacheInfrastructureModule } from '../../../infrastructure/cache/cache.module'

import { CertificationController } from './certification.controller'

// Use Cases
import { CreateCertificationCommand } from '../../../application/use-cases/commands/certification/CreateCertificationCommand'
import { UpdateCertificationCommand } from '../../../application/use-cases/commands/certification/UpdateCertificationCommand'
import { DeleteCertificationCommand } from '../../../application/use-cases/commands/certification/DeleteCertificationCommand'
import { GetCertificationsQuery } from '../../../application/use-cases/queries/skill/certificate/GetCertificationsQuery'

// Repositories
import { PrismaCertificationReadRepository } from '../../../infrastructure/database/repositories/certification/PrismaCertificationReadRepository'
import { PrismaCertificationWriteRepository } from '../../../infrastructure/database/repositories/certification/PrismaCertificationWriteRepository'

@Module({
    imports: [
        AuthModule,
        CacheInfrastructureModule,        // Provides ICacheQueryService & ICacheInvalidationService
    ],

    controllers: [CertificationController],

    providers: [
        // Infrastructure Implementations
        PrismaCertificationReadRepository,
        PrismaCertificationWriteRepository,

        // Ports (Abstractions)
        {
        provide: 'ICertificationReadRepository',
        useExisting: PrismaCertificationReadRepository,
        },
        {
        provide: 'ICertificationWriteRepository',
        useExisting: PrismaCertificationWriteRepository,
        },

        // Application Use Cases
        GetCertificationsQuery,
        CreateCertificationCommand,
        UpdateCertificationCommand,
        DeleteCertificationCommand,
    ],
})
export class CertificationModule {}