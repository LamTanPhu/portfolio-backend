import { Module } from '@nestjs/common'
import { CreateSkillCommand } from '../../../application/use-cases/commands/skill/CreateSkillCommand'
import { DeleteSkillCommand } from '../../../application/use-cases/commands/skill/DeleteSkillCommand'
import { UpdateSkillCommand } from '../../../application/use-cases/commands/skill/UpdateSkillCommand'
import { GetPublishedSkillsQuery } from '../../../application/use-cases/queries/skill/GetPublishedSkillsQuery'
import { PrismaSkillRepository } from '../../../infrastructure/database/repositories/PrismaSkillRepository'
import { AuthModule } from '../auth/auth.module'
import { SkillController } from './skill.controller'

// =============================================================================
// SkillModule
// AuthModule imported — JwtAuthGuard on admin endpoints needs AuthService.
// PrismaSkillRepository implements both read and write interfaces.
// =============================================================================
@Module({
    imports: [AuthModule],
    controllers: [SkillController],
    providers: [
        // ─── Repositories ───────────────────────────────────────────────────────
        PrismaSkillRepository,
        { provide: 'ISkillReadRepository',  useExisting: PrismaSkillRepository },
        { provide: 'ISkillWriteRepository', useExisting: PrismaSkillRepository },

        // ─── Use cases ──────────────────────────────────────────────────────────
        {
        provide:    GetPublishedSkillsQuery,
        useFactory: (repo: PrismaSkillRepository) =>
            new GetPublishedSkillsQuery(repo),
            inject: [PrismaSkillRepository],
        },
        {
        provide:    CreateSkillCommand,
        useFactory: (repo: PrismaSkillRepository) =>
            new CreateSkillCommand(repo),
            inject: [PrismaSkillRepository],
        },
        {
        provide:    UpdateSkillCommand,
        useFactory: (repo: PrismaSkillRepository) =>
            new UpdateSkillCommand(repo),
            inject: [PrismaSkillRepository],
        },
        {
        provide:    DeleteSkillCommand,
        useFactory: (repo: PrismaSkillRepository) =>
            new DeleteSkillCommand(repo),
            inject: [PrismaSkillRepository],
        },
    ],
})
export class SkillModule {}