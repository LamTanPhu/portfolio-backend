/**
 * @fileoverview PrismaAdminCredentialRepository
 *
 * Infrastructure implementation of IAdminCredentialRepository.
 * The ONLY place in the entire codebase that selects hashPassword from the DB.
 *
 * Design decisions:
 * - Separate from PrismaUserReadRepository which explicitly NEVER selects hashPassword.
 *   Keeping them separate ensures the safe USER_SAFE_SELECT constant can never
 *   be accidentally expanded to include credentials.
 * - Returns AdminCredential (id + hashPassword) — NOT a domain User.
 *   hashPassword must never enter the domain layer even transiently.
 * - Used exclusively by AuthService.login() — no other caller should exist.
 */

import { Injectable } from '@nestjs/common'
import type {
    AdminCredential,
    IAdminCredentialRepository,
} from '../../../../domain/repositories/user/IAdminCredentialRepository'
import { PrismaService } from '../../prisma/prisma.service'

// This is the ONLY select in the codebase that includes hashPassword.
// If you ever need to add fields here, think very carefully.
const CREDENTIAL_SELECT = {
    id:           true,
    hashPassword: true,
} as const

@Injectable()
export class PrismaAdminCredentialRepository implements IAdminCredentialRepository {
    constructor(private readonly prisma: PrismaService) {}

    // O(1) — email has @unique index
    async findCredentialByEmail(email: string): Promise<AdminCredential | null> {
        const row = await this.prisma.client.user.findUnique({
            where:  { email },
            select: CREDENTIAL_SELECT,
        })

        if (!row) return null

        return {
            id:           row.id,
            hashPassword: row.hashPassword,
        }
    }
}