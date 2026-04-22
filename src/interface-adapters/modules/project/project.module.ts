import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ProjectController } from './project.controller'
import { GetPublishedProjectsQuery } from '../../../application/use-cases/queries/project/GetPublishedProjectsQuery'
import { GetProjectBySlugQuery } from '../../../application/use-cases/queries/project/GetProjectBySlugQuery'
import { CreateProjectCommand } from '../../../application/use-cases/commands/project/CreateProjectCommand'
import { PrismaProjectRepository } from '../../../infrastructure/database/repositories/PrismaProjectRepository'

// =============================================================================
// ProjectModule
// Imports AuthModule — JwtAuthGuard depends on AuthService from AuthModule.
// =============================================================================
@Module({
  imports: [AuthModule],
  controllers: [ProjectController],
  providers: [
    PrismaProjectRepository,
    { provide: 'IProjectReadRepository',  useExisting: PrismaProjectRepository },
    { provide: 'IProjectWriteRepository', useExisting: PrismaProjectRepository },
    {
      provide:    GetPublishedProjectsQuery,
      useFactory: (repo: PrismaProjectRepository) =>
        new GetPublishedProjectsQuery(repo),
      inject: [PrismaProjectRepository],
    },
    {
      provide:    GetProjectBySlugQuery,
      useFactory: (repo: PrismaProjectRepository) =>
        new GetProjectBySlugQuery(repo),
      inject: [PrismaProjectRepository],
    },
    {
      provide:    CreateProjectCommand,
      useFactory: (repo: PrismaProjectRepository) =>
        new CreateProjectCommand(repo),
      inject: [PrismaProjectRepository],
    },
  ],
})
export class ProjectModule {}