import { Inject, Injectable } from '@nestjs/common'
import type { ISocialAccountWriteRepository } from '../../../../domain/repositories/social/ISocialAccountWriteRepository'

// =============================================================================
// DeleteSocialAccountCommand
// NotFoundError thrown by repository if id does not exist — no pre-check needed.
// O(1) — single DB query, no read-before-write.
// =============================================================================
@Injectable()
export class DeleteSocialAccountCommand {
    constructor(
        @Inject('ISocialAccountWriteRepository')
        private readonly repo: ISocialAccountWriteRepository,
    ) {}

    async execute(id: number): Promise<void> {
        await this.repo.delete(id)
    }
}