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

@Injectable()
export class GetPublicSocialAccountsQuery {
    constructor(
        @Inject('ISocialAccountReadRepository')
        private readonly repo: ISocialAccountReadRepository,

        @Inject('ICacheQueryService')
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