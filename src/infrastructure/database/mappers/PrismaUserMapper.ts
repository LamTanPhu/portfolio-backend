/**
 * @fileoverview PrismaUserMapper
 * 
 * Centralized mapper for User aggregate.
 * Ensures hashPassword is never accidentally exposed.
 */

import { Prisma } from '@prisma/client'
import { User } from '../../../domain/entities/User'

export const USER_SAFE_SELECT = {
  id:        true,
  firstname: true,
  lastname:  true,
  email:     true,
  aboutme:   true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
} as const

type SafeUser = Prisma.UserGetPayload<{ select: typeof USER_SAFE_SELECT }>

export class PrismaUserMapper {
  static toDomain(raw: SafeUser): User {
    return new User(
      raw.id,
      raw.firstname,
      raw.lastname,
      raw.email,
      raw.aboutme,
      raw.lastLogin,
      raw.createdAt,
      raw.updatedAt,
    )
  }
}