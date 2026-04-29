import { Injectable, Inject } from '@nestjs/common'
import type { IUserReadRepository } from '../../../../domain/repositories/user/IUserReadRepository'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'

export interface UserProfileDTO {
  id:        number
  firstname: string
  lastname:  string
  email:     string
  aboutme:   string | null
  lastLogin: string | null
}

// =============================================================================
// GetUserProfileQuery
// Returns the portfolio owner's public profile.
// hashPassword never returned — excluded at repository level.
// =============================================================================
@Injectable()
export class GetUserProfileQuery {
  constructor(
    @Inject('IUserReadRepository')
    private readonly repo: IUserReadRepository,
  ) {}

  async execute(userId: number): Promise<UserProfileDTO> {
    const user = await this.repo.findById(userId)
    if (!user) throw new NotFoundError(`User not found: ${userId}`)

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