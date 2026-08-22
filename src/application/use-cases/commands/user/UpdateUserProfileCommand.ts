/**
 * @fileoverview UpdateUserProfileCommand
 *
 * Updates the portfolio owner's profile and invalidates the cache.
 */

import { Injectable, Inject } from '@nestjs/common'
import type { IUserWriteRepository, UpdateUserInput } from '../../../../domain/repositories/user/IUserWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import type { UserProfileDTO } from '../../../dtos/UserProfileDTO'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

@Injectable()
export class UpdateUserProfileCommand {
    constructor(
        @Inject('IUserWriteRepository')
        private readonly repo: IUserWriteRepository,

        @Inject(CACHE_INVALIDATION_SERVICE)
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(userId: number, data: UpdateUserInput): Promise<UserProfileDTO> {
        const user = await this.repo.update(userId, data)

        await this.cacheService.invalidateUserProfile(userId)

        return {
            id: user.id,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            aboutme: user.aboutme,
            lastLogin: user.lastLogin?.toISOString() ?? null,
        }
    }
}
