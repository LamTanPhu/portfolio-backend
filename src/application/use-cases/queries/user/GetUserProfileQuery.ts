/**
 * @fileoverview GetUserProfileQuery
 * 
 * Returns the portfolio owner's profile (the only admin user).
 * Uses LONG cache profile — profile changes very infrequently.
 */

import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { IUserReadRepository } from '../../../../domain/repositories/user/IUserReadRepository'

import type { ICacheQueryService } from '../../../ports/ICacheQueryService'
import type { UserProfileDTO } from '../../../dtos/UserProfileDTO'
import { CACHE_QUERY_SERVICE } from '../../../../application/ports/cache.tokens'

@Injectable()
export class GetUserProfileQuery {
  constructor(
    @Inject('IUserReadRepository')
    private readonly repo: IUserReadRepository,

    @Inject(CACHE_QUERY_SERVICE)
    private readonly cacheQuery: ICacheQueryService,
  ) {}

  async execute(userId: number): Promise<UserProfileDTO> {
    return this.cacheQuery.getOrSetWithProfile(
      `user:profile:${userId}`,
      'LONG',                    // Profile rarely changes
      async () => {
        const user = await this.repo.findById(userId)
        if (!user) {
          throw new NotFoundError(`User not found: ${userId}`)
        }

        return {
          id:        user.id,
          firstname: user.firstname,
          lastname:  user.lastname,
          email:     user.email,
          aboutme:   user.aboutme,
          lastLogin: user.lastLogin?.toISOString() ?? null,
        }
      },
    )
  }
}