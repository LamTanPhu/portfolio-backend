/**
 * @fileoverview SkillModule
 * 
 * Manages skills for the portfolio (public display + admin CRUD).
 * Uses split Read/Write repositories and caching support.
 */

import { Module } from '@nestjs/common'
import { CacheInfrastructureModule } from '../../../infrastructure/cache/cache.module'
import { AuthModule } from '../auth/auth.module'

import { SkillController } from './skill.controller'

// Use Cases
import { CreateSkillCommand } from '../../../application/use-cases/commands/skill/CreateSkillCommand'
import { DeleteSkillCommand } from '../../../application/use-cases/commands/skill/DeleteSkillCommand'
import { UpdateSkillCommand } from '../../../application/use-cases/commands/skill/UpdateSkillCommand'
import { GetPublishedSkillsQuery } from '../../../application/use-cases/queries/skill/GetPublishedSkillsQuery'

// Repositories
import { PrismaSkillReadRepository } from '../../../infrastructure/database/repositories/skill/PrismaSkillReadRepository'
import { PrismaSkillWriteRepository } from '../../../infrastructure/database/repositories/skill/PrismaSkillWriteRepository'

@Module({
    imports: [
        AuthModule,
        CacheInfrastructureModule,
    ],

    controllers: [SkillController],

    providers: [
        // Repositories
        PrismaSkillReadRepository,
        PrismaSkillWriteRepository,

        // Ports
        { provide: 'ISkillReadRepository', useExisting: PrismaSkillReadRepository },
        { provide: 'ISkillWriteRepository', useExisting: PrismaSkillWriteRepository },

        // Use Cases
        GetPublishedSkillsQuery,
        CreateSkillCommand,
        UpdateSkillCommand,
        DeleteSkillCommand,
    ],
})
export class SkillModule {}