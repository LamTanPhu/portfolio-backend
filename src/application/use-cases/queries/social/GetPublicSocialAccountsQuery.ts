/**
 * @fileoverview GetPublicSocialAccountsQuery
 * 
 * Returns all public social accounts (GitHub, LinkedIn, etc.).
 * Uses LONG cache profile since social links change infrequently.
 */

import { Inject, Injectable } from '@nestjs/common'
import type { ISocialAccountReadRepository } from '../../../../domain/repositories/social/ISocialAccountReadRepository'

import type { SocialAccountDTO } from '../../../dtos/SocialAccountDTO'
import type { ICacheQueryService } from '../../../ports/ICacheQueryService'
import { CACHE_QUERY_SERVICE } from '../../../../application/ports/cache.tokens'

@Injectable()
export class GetPublicSocialAccountsQuery {
    constructor(
        @Inject('ISocialAccountReadRepository')
        private readonly repo: ISocialAccountReadRepository,

        @Inject(CACHE_QUERY_SERVICE)
        private readonly cacheQuery: ICacheQueryService,
    ) {}

    async execute(): Promise<SocialAccountDTO[]> {
        return this.cacheQuery.getOrSetWithProfile(
        'social:list:public',
        'LONG',
        async () => {
            const accounts = await this.repo.findPublic()
            return accounts
        },
        )
    }
}