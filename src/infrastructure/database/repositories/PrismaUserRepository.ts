import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { IUserReadRepository } from '../../../domain/repositories/user/IUserReadRepository'
import type {
    IUserWriteRepository,
    UpdateUserInput,
} from '../../../domain/repositories/user/IUserWriteRepository'
import { User } from '../../../domain/entities/User'
import { NotFoundError } from '../../../domain/errors/NotFoundError'

// =============================================================================
// Select clause — explicitly excludes hashPassword
// Defense in depth — even if mapper changes, password never leaks.
// =============================================================================
const USER_SAFE_SELECT = {
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

// =============================================================================
// PrismaUserRepository
// hashPassword never selected — defense in depth against accidental exposure.
// update catches P2025 — eliminates read-before-write round trip.
// O(1) guaranteed — all queries use unique indexes.
// =============================================================================
@Injectable()
export class PrismaUserRepository
    implements IUserReadRepository, IUserWriteRepository
    {
    constructor(private readonly prisma: PrismaService) {}

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

    // O(1) — id is primary key
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
        try {
        const row = await this.prisma.client.user.update({
            where:  { id },
            data,
            select: USER_SAFE_SELECT,
        })
        return PrismaUserRepository.toDomain(row)
        } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            throw new NotFoundError(`User not found: ${id}`)
        }
        throw error
        }
    }
}