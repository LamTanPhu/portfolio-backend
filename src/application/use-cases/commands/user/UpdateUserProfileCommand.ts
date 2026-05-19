/**
 * @fileoverview UpdateUserProfileCommand
 * 
 * Updates the portfolio owner's profile and invalidates the cache.
 */

import { Injectable, Inject } from '@nestjs/common'
import type { IUserWriteRepository, UpdateUserInput } from '../../../../domain/repositories/user/IUserWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import type { UserProfileDTO } from '../../../dtos/UserProfileDTO'

@Injectable()
export class UpdateUserProfileCommand {
  constructor(
    @Inject('IUserWriteRepository')
    private readonly repo: IUserWriteRepository,

    @Inject('ICacheInvalidationService')
    private readonly cacheService: ICacheInvalidationService,
  ) {}

  async execute(userId: number, data: UpdateUserInput): Promise<UserProfileDTO> {
    const user = await this.repo.update(userId, data)

    // Invalidate cached profile
    await this.cacheService.invalidatePattern(`user:profile:${userId}`)

    return {
      id:        user.id,
      firstname: user.firstname,
      lastname:  user.lastname,
      email:     user.email,
      aboutme:   user.aboutme,
      lastLogin: user.lastLogin?.toISOString() ?? null,
    }
  }
}