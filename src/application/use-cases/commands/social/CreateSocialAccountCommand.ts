/**
 * @fileoverview CreateSocialAccountCommand
 * 
 * Creates a new social account link and invalidates the public cache.
 */

import { Injectable, Inject } from '@nestjs/common'
import type { CreateSocialAccountInput, ISocialAccountWriteRepository } from '../../../../domain/repositories/social/ISocialAccountWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import type { SocialAccountDTO } from '../../../dtos/SocialAccountDTO'

@Injectable()
export class CreateSocialAccountCommand {
    constructor(
        @Inject('ISocialAccountWriteRepository')
        private readonly repo: ISocialAccountWriteRepository,

        @Inject('ICacheInvalidationService')
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(input: CreateSocialAccountInput): Promise<SocialAccountDTO> {
        const account = await this.repo.create(input)

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