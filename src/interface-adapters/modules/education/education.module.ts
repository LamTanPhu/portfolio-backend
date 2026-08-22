/**
 * @fileoverview EducationModule
 *
 * Manages education records (public view + admin CRUD).
 * Uses split Read/Write repositories and proper caching.
 */

import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { CacheInfrastructureModule } from '../../../infrastructure/cache/cache.module'

import { EducationController } from './education.controller'

// Use Cases
import { GetEducationQuery } from '../../../application/use-cases/queries/skill/education/GetEducationQuery'
import { CreateEducationCommand } from '../../../application/use-cases/commands/education/CreateEducationCommand'
import { UpdateEducationCommand } from '../../../application/use-cases/commands/education/UpdateEducationCommand'
import { DeleteEducationCommand } from '../../../application/use-cases/commands/education/DeleteEducationCommand'

// Repositories
import { PrismaEducationReadRepository } from '../../../infrastructure/database/repositories/education/PrismaEducationReadRepository'
import { PrismaEducationWriteRepository } from '../../../infrastructure/database/repositories/education/PrismaEducationWriteRepository'

@Module({
    imports: [
        AuthModule,
        CacheInfrastructureModule, // Required for caching
    ],

    controllers: [EducationController],

    providers: [
        // Repositories
        PrismaEducationReadRepository,
        PrismaEducationWriteRepository,

        // Ports
        {
            provide: 'IEducationReadRepository',
            useExisting: PrismaEducationReadRepository,
        },
        {
            provide: 'IEducationWriteRepository',
            useExisting: PrismaEducationWriteRepository,
        },

        // Use Cases
        GetEducationQuery,
        CreateEducationCommand,
        UpdateEducationCommand,
        DeleteEducationCommand,
    ],
})
export class EducationModule {}
