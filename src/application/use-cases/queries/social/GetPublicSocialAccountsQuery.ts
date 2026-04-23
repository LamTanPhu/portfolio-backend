import { Inject, Injectable } from '@nestjs/common'
import type { ISocialAccountReadRepository } from '../../../../domain/repositories/social/ISocialAccountReadRepository'
import type { SocialAccountDTO } from '../../../dtos/SocialAccountDTO'

// =============================================================================
// GetPublicSocialAccountsQuery
// Returns only public social accounts — GitHub, LinkedIn, X, etc.
// isPublic filter applied at repository level — private accounts never exposed.
// Ordered by name alphabetically — consistent display order in frontend.
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