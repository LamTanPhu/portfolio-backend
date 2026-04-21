import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { IUserReadRepository } from '../../../domain/repositories/user/IUserReadRepository'
import type {
    IUserWriteRepository,
    UpdateUserInput,
} from '../../../domain/repositories/user/IUserWriteRepository'
import { User } from '../../../domain/entities/User'

// =============================================================================
// Select clause — explicitly excludes hashPassword
// Defense in depth — even if mapper changes, password never leaks
// Using select instead of omit — select is additive and type-safe
// =============================================================================
const USER_SAFE_SELECT = {
    id:          true,
    firstname:   true,
    lastname:    true,
    email:       true,
    aboutme:     true,
    lastLogin:   true,
    createdAt:   true,
    updatedAt:   true,
  // hashPassword intentionally absent — never selected, never returned
} as const

// Derive type directly from select — no casting, fully type-safe
type SafeUser = Prisma.UserGetPayload<{ select: typeof USER_SAFE_SELECT }>

// =============================================================================
// PrismaUserRepository
// hashPassword never selected — defense in depth against accidental exposure.
// Single user record (portfolio owner) — all queries by id or email.
// Both lookups use unique indexes — O(1) guaranteed.
// =============================================================================
@Injectable()
export class PrismaUserRepository
    implements IUserReadRepository, IUserWriteRepository
{
    constructor(private readonly prisma: PrismaService) {}

    // Mapper accepts SafeUser — no casting needed, fully type-safe
    private static toDomain(raw: SafeUser): User {
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

    // O(1) — id is primary key, indexed
    async findById(id: number): Promise<User | null> {
        const row = await this.prisma.client.user.findUnique({
            where:  { id },
            select: USER_SAFE_SELECT,
        })
        return row ? PrismaUserRepository.toDomain(row) : null
    }

    // O(1) — email has @unique index
    async findByEmail(email: string): Promise<User | null> {
        const row = await this.prisma.client.user.findUnique({
            where:  { email },
            select: USER_SAFE_SELECT,
        })
        return row ? PrismaUserRepository.toDomain(row) : null
    }

    async update(id: number, data: UpdateUserInput): Promise<User> {
        const row = await this.prisma.client.user.update({
            where:  { id },
            data,
            select: USER_SAFE_SELECT,
        })
        return PrismaUserRepository.toDomain(row)
    }
}