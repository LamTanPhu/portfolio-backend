/**
 * @fileoverview UpdateSocialAccountCommand
 * 
 * Updates a social account and invalidates the public cache.
 */

import { Injectable, Inject } from '@nestjs/common'
import type {
    ISocialAccountWriteRepository,
    UpdateSocialAccountInput,
} from '../../../../domain/repositories/social/ISocialAccountWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import type { SocialAccountDTO } from '../../../dtos/SocialAccountDTO'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

interface UpdateInput extends UpdateSocialAccountInput {
    id: number
}

@Injectable()
export class UpdateSocialAccountCommand {
    constructor(
        @Inject('ISocialAccountWriteRepository')
        private readonly repo: ISocialAccountWriteRepository,

        @Inject(CACHE_INVALIDATION_SERVICE)
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(input: UpdateInput): Promise<SocialAccountDTO> {
        const { id, ...data } = input

        const account = await this.repo.update(id, data)

        // Invalidate public social accounts cache
        await this.cacheService.invalidatePublicSocialAccounts()

        return {
        id:       account.id,
        name:     account.name,
        url:      account.url,
        imageUrl: account.imageUrl,
        isPublic: account.isPublic,
        }
    }
}