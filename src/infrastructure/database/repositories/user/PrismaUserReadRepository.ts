/**
 * @fileoverview PrismaUserReadRepository
 * Read-only repository for User aggregate.
 * Never selects hashPassword — defense in depth.
 */

import { Injectable } from '@nestjs/common'
import type { IUserReadRepository } from '../../../../domain/repositories/user/IUserReadRepository'
import { User } from '../../../../domain/entities/User'
import { PrismaService } from '../../prisma/prisma.service'
import { PrismaUserMapper, USER_SAFE_SELECT } from '../../mappers/PrismaUserMapper'

@Injectable()
export class PrismaUserReadRepository implements IUserReadRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findById(id: number): Promise<User | null> {
        const row = await this.prisma.client.user.findUnique({
        where: { id },
        select: USER_SAFE_SELECT,
        })
        return row ? PrismaUserMapper.toDomain(row) : null
    }

    async findByEmail(email: string): Promise<User | null> {
        const row = await this.prisma.client.user.findUnique({
        where: { email },
        select: USER_SAFE_SELECT,
        })
        return row ? PrismaUserMapper.toDomain(row) : null
    }
}