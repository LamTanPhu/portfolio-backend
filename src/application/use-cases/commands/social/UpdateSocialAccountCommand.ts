import { Inject, Injectable } from '@nestjs/common'
import type {
    ISocialAccountWriteRepository,
    UpdateSocialAccountInput,
} from '../../../../domain/repositories/social/ISocialAccountWriteRepository'
import type { SocialAccountDTO } from '../../../dtos/SocialAccountDTO'

interface Input extends UpdateSocialAccountInput {
    id: number
}

// =============================================================================
// UpdateSocialAccountCommand
// NotFoundError thrown by repository if id does not exist — no pre-check needed.
// O(1) — single DB query, no read-before-write.
// =============================================================================
@Injectable()
export class UpdateSocialAccountCommand {
    constructor(
        @Inject('ISocialAccountWriteRepository')
        private readonly repo: ISocialAccountWriteRepository,
    ) {}

    async execute(input: Input): Promise<SocialAccountDTO> {
        const { id, ...data } = input
        const account = await this.repo.update(id, data)
        return {
        id:       account.id,
        name:     account.name,
        url:      account.url,
        imageUrl: account.imageUrl,
        isPublic: account.isPublic,
        }
    }
}