import { Module } from '@nestjs/common'
import { CreateEducationCommand } from '../../../application/use-cases/commands/education/CreateEducationCommand'
import { DeleteEducationCommand } from '../../../application/use-cases/commands/education/DeleteEducationCommand'
import { UpdateEducationCommand } from '../../../application/use-cases/commands/education/UpdateEducationCommand'
import { GetEducationQuery } from '../../../application/use-cases/queries/skill/education/GetEducationQuery'
import { PrismaEducationRepository } from '../../../infrastructure/database/repositories/PrismaEducationRepository'
import { AuthModule } from '../auth/auth.module'
import { EducationController } from './education.controller'

// =============================================================================
// EducationModule
// AuthModule imported — JwtAuthGuard on admin endpoints needs AuthService.
// PrismaEducationRepository implements both read and write interfaces.
// =============================================================================
@Module({
    imports: [AuthModule],
    controllers: [EducationController],
    providers: [
        // ─── Repositories ───────────────────────────────────────────────────────
        PrismaEducationRepository,
        { provide: 'IEducationReadRepository',  useExisting: PrismaEducationRepository },
        { provide: 'IEducationWriteRepository', useExisting: PrismaEducationRepository },

        // ─── Use cases ──────────────────────────────────────────────────────────
        {
        provide:    GetEducationQuery,
        useFactory: (repo: PrismaEducationRepository) =>
            new GetEducationQuery(repo),
        inject: [PrismaEducationRepository],
        },
        {
        provide:    CreateEducationCommand,
        useFactory: (repo: PrismaEducationRepository) =>
            new CreateEducationCommand(repo),
        inject: [PrismaEducationRepository],
        },
        {
        provide:    UpdateEducationCommand,
        useFactory: (repo: PrismaEducationRepository) =>
            new UpdateEducationCommand(repo),
        inject: [PrismaEducationRepository],
        },
        {
        provide:    DeleteEducationCommand,
        useFactory: (repo: PrismaEducationRepository) =>
            new DeleteEducationCommand(repo),
        inject: [PrismaEducationRepository],
        },
    ],
})
export class EducationModule {}