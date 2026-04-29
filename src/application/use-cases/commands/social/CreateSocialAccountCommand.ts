import { Inject, Injectable } from '@nestjs/common'
import type { CreateSocialAccountInput, ISocialAccountWriteRepository } from '../../../../domain/repositories/social/ISocialAccountWriteRepository'
import type { SocialAccountDTO } from '../../../dtos/SocialAccountDTO'

// =============================================================================
// CreateSocialAccountCommand
// Creates a new social account link for the portfolio owner.
// userId from verified JWT payload — never from client input.
// =============================================================================
@Injectable()
export class CreateSocialAccountCommand {
    constructor(
        @Inject('ISocialAccountWriteRepository')
        private readonly repo: ISocialAccountWriteRepository,
    ) {}

    async execute(input: CreateSocialAccountInput): Promise<SocialAccountDTO> {
        const account = await this.repo.create(input)
        return {
        id:       account.id,
        name:     account.name,
        url:      account.url,
        imageUrl: account.imageUrl,
        isPublic: account.isPublic,
        }
    }
}