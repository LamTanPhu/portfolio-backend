/**
 * @fileoverview ProjectModule
 *
 * Manages projects (public display + admin CRUD).
 * Uses split Read/Write repositories and full caching support.
 */

import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { CacheInfrastructureModule } from '../../../infrastructure/cache/cache.module'

import { ProjectController } from './project.controller'

// Use Cases
import { GetPublishedProjectsQuery } from '../../../application/use-cases/queries/project/GetPublishedProjectsQuery'
import { GetProjectBySlugQuery } from '../../../application/use-cases/queries/project/GetProjectBySlugQuery'
import { CreateProjectCommand } from '../../../application/use-cases/commands/project/CreateProjectCommand'
import { UpdateProjectCommand } from '../../../application/use-cases/commands/project/UpdateProjectCommand'
import { DeleteProjectCommand } from '../../../application/use-cases/commands/project/DeleteProjectCommand'

// Repositories
import { PrismaProjectReadRepository } from '../../../infrastructure/database/repositories/project/PrismaProjectReadRepository'
import { PrismaProjectWriteRepository } from '../../../infrastructure/database/repositories/project/PrismaProjectWriteRepository'

@Module({
    imports: [AuthModule, CacheInfrastructureModule],

    controllers: [ProjectController],

    providers: [
        // Repositories
        PrismaProjectReadRepository,
        PrismaProjectWriteRepository,

        // Ports
        { provide: 'IProjectReadRepository', useExisting: PrismaProjectReadRepository },
        { provide: 'IProjectWriteRepository', useExisting: PrismaProjectWriteRepository },

        // Use Cases
        GetPublishedProjectsQuery,
        GetProjectBySlugQuery,
        CreateProjectCommand,
        UpdateProjectCommand,
        DeleteProjectCommand,
    ],
})
export class ProjectModule {}
