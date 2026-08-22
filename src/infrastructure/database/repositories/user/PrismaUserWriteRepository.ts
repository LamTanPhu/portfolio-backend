/**
 * @fileoverview PrismaUserWriteRepository
 * Write-only repository for User aggregate.
 */

import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { IUserWriteRepository, UpdateUserInput } from '../../../../domain/repositories/user/IUserWriteRepository'
import { User } from '../../../../domain/entities/User'
import { PrismaService } from '../../prisma/prisma.service'
import { PrismaUserMapper, USER_SAFE_SELECT } from '../../mappers/PrismaUserMapper'

@Injectable()
export class PrismaUserWriteRepository implements IUserWriteRepository {
    constructor(private readonly prisma: PrismaService) {}

    async update(id: number, data: UpdateUserInput): Promise<User> {
        try {
            const row = await this.prisma.client.user.update({
                where: { id },
                data,
                select: USER_SAFE_SELECT,
            })
            return PrismaUserMapper.toDomain(row)
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundError(`User not found: ${id}`)
            }
            throw error
        }
    }
}
