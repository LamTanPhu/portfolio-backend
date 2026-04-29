import { Injectable, Inject } from '@nestjs/common'
import type { IUserWriteRepository, UpdateUserInput } from '../../../../domain/repositories/user/IUserWriteRepository'
import type { IUserReadRepository } from '../../../../domain/repositories/user/IUserReadRepository'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { UserProfileDTO } from '../../../dtos/UserProfileDTO'
// =============================================================================
// UpdateUserProfileCommand
// NotFoundError thrown by repository if id does not exist — no pre-check needed.
// O(1) — single DB query, no read-before-write.
// =============================================================================
@Injectable()
export class UpdateUserProfileCommand {
  constructor(
    @Inject('IUserWriteRepository')
    private readonly repo: IUserWriteRepository,
  ) {}

  async execute(userId: number, data: UpdateUserInput): Promise<UserProfileDTO> {
    const user = await this.repo.update(userId, data)
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