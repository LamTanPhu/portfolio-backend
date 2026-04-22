import { Injectable, Inject } from '@nestjs/common'
import type { ISocialAccountReadRepository } from '../../../../domain/repositories/social/ISocialAccountReadRepository'
import type { SocialAccountDTO } from '../../../dtos/SocialAccountDTO'

// =============================================================================
// GetPublicSocialAccountsQuery
// Returns only public social accounts — GitHub, LinkedIn, etc.
// Private accounts (personal email, phone) never returned.
// =============================================================================
@Injectable()
export class GetPublicSocialAccountsQuery {
    constructor(
        @Inject('ISocialAccountReadRepository')
        private readonly repo: ISocialAccountReadRepository,
    ) {}

    async execute(): Promise<SocialAccountDTO[]> {
        const accounts = await this.repo.findPublic()
        return accounts.map((a) => ({
        id:       a.id,
        name:     a.name,
        url:      a.url,
        imageUrl: a.imageUrl,
        }))
    }
}