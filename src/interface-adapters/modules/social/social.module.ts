import { Module } from '@nestjs/common'
import { CreateSocialAccountCommand } from '../../../application/use-cases/commands/social/CreateSocialAccountCommand'
import { DeleteSocialAccountCommand } from '../../../application/use-cases/commands/social/DeleteSocialAccountCommand'
import { UpdateSocialAccountCommand } from '../../../application/use-cases/commands/social/UpdateSocialAccountCommand'
import { GetPublicSocialAccountsQuery } from '../../../application/use-cases/queries/social/GetPublicSocialAccountsQuery'
import { PrismaSocialAccountRepository } from '../../../infrastructure/database/repositories/PrismaSocialAccountRepository'
import { AuthModule } from '../auth/auth.module'
import { SocialController } from './social.controller'

// =============================================================================
// SocialModule
// AuthModule imported — JwtAuthGuard on admin endpoints needs AuthService.
// PrismaSocialAccountRepository implements both read and write interfaces.
// =============================================================================
@Module({
    imports: [AuthModule],
    controllers: [SocialController],
    providers: [
        // ─── Repositories ───────────────────────────────────────────────────────
        PrismaSocialAccountRepository,
        { provide: 'ISocialAccountReadRepository',  useExisting: PrismaSocialAccountRepository },
        { provide: 'ISocialAccountWriteRepository', useExisting: PrismaSocialAccountRepository },

        // ─── Use cases ──────────────────────────────────────────────────────────
        {
        provide:    GetPublicSocialAccountsQuery,
        useFactory: (repo: PrismaSocialAccountRepository) =>
            new GetPublicSocialAccountsQuery(repo),
        inject: [PrismaSocialAccountRepository],
        },
        {
        provide:    CreateSocialAccountCommand,
        useFactory: (repo: PrismaSocialAccountRepository) =>
            new CreateSocialAccountCommand(repo),
        inject: [PrismaSocialAccountRepository],
        },
        {
        provide:    UpdateSocialAccountCommand,
        useFactory: (repo: PrismaSocialAccountRepository) =>
            new UpdateSocialAccountCommand(repo),
        inject: [PrismaSocialAccountRepository],
        },
        {
        provide:    DeleteSocialAccountCommand,
        useFactory: (repo: PrismaSocialAccountRepository) =>
            new DeleteSocialAccountCommand(repo),
        inject: [PrismaSocialAccountRepository],
        },
    ],
})
export class SocialModule {}