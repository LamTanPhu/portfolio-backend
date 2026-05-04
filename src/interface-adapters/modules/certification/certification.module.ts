import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { CertificationController } from './certification.controller'
import { GetCertificationsQuery } from '../../../application/use-cases/queries/skill/certificate/GetCertificationsQuery'
import { CreateCertificationCommand } from '../../../application/use-cases/commands/certification/CreateCertificationCommand'
import { UpdateCertificationCommand } from '../../../application/use-cases/commands/certification/UpdateCertificationCommand'
import { DeleteCertificationCommand } from '../../../application/use-cases/commands/certification/DeleteCertificationCommand'
import { PrismaCertificationRepository } from '../../../infrastructure/database/repositories/PrismaCertificationRepository'

// =============================================================================
// CertificationModule
// AuthModule imported — JwtAuthGuard on admin endpoints needs AuthService.
// PrismaCertificationRepository implements both read and write interfaces.
// =============================================================================
@Module({
    imports: [AuthModule],
    controllers: [CertificationController],
    providers: [
        // ─── Repositories ───────────────────────────────────────────────────────
        PrismaCertificationRepository,
        { provide: 'ICertificationReadRepository',  useExisting: PrismaCertificationRepository },
        { provide: 'ICertificationWriteRepository', useExisting: PrismaCertificationRepository },

        // ─── Use cases ──────────────────────────────────────────────────────────
        {
        provide:    GetCertificationsQuery,
        useFactory: (repo: PrismaCertificationRepository) =>
            new GetCertificationsQuery(repo),
        inject: [PrismaCertificationRepository],
        },
        {
        provide:    CreateCertificationCommand,
        useFactory: (repo: PrismaCertificationRepository) =>
            new CreateCertificationCommand(repo),
        inject: [PrismaCertificationRepository],
        },
        {
        provide:    UpdateCertificationCommand,
        useFactory: (repo: PrismaCertificationRepository) =>
            new UpdateCertificationCommand(repo),
        inject: [PrismaCertificationRepository],
        },
        {
        provide:    DeleteCertificationCommand,
        useFactory: (repo: PrismaCertificationRepository) =>
            new DeleteCertificationCommand(repo),
        inject: [PrismaCertificationRepository],
        },
    ],
})
export class CertificationModule {}