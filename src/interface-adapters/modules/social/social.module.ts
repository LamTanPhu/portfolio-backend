/**
 * @fileoverview SocialModule
 *
 * Manages social accounts (public display + admin CRUD).
 * Uses split Read/Write repositories and caching support.
 */

import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { CacheInfrastructureModule } from '../../../infrastructure/cache/cache.module'

import { SocialController } from './social.controller'

// Use Cases
import { GetPublicSocialAccountsQuery } from '../../../application/use-cases/queries/social/GetPublicSocialAccountsQuery'
import { CreateSocialAccountCommand } from '../../../application/use-cases/commands/social/CreateSocialAccountCommand'
import { UpdateSocialAccountCommand } from '../../../application/use-cases/commands/social/UpdateSocialAccountCommand'
import { DeleteSocialAccountCommand } from '../../../application/use-cases/commands/social/DeleteSocialAccountCommand'

import { PrismaSocialAccountReadRepository } from '../../../infrastructure/database/repositories/social-account/PrismaSocialAccountReadRepository'
import { PrismaSocialAccountWriteRepository } from '../../../infrastructure/database/repositories/social-account/PrismaSocialAccountWriteRepository'

@Module({
    imports: [AuthModule, CacheInfrastructureModule],

    controllers: [SocialController],

    providers: [
        // Repositories
        PrismaSocialAccountReadRepository,
        PrismaSocialAccountWriteRepository,

        // Ports
        { provide: 'ISocialAccountReadRepository', useExisting: PrismaSocialAccountReadRepository },
        { provide: 'ISocialAccountWriteRepository', useExisting: PrismaSocialAccountWriteRepository },

        // Use Cases
        GetPublicSocialAccountsQuery,
        CreateSocialAccountCommand,
        UpdateSocialAccountCommand,
        DeleteSocialAccountCommand,
    ],
})
export class SocialModule {}
