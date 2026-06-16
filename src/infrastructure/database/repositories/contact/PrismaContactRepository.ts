/**
 * @fileoverview PrismaContactRepository
 *
 * Implements both IContactWriteRepository and IContactReadRepository.
 * The single class satisfies both interfaces — ISP says callers should depend
 * on narrow interfaces, not that implementations must be split into multiple classes.
 *
 * Both interfaces are registered as separate tokens in ContactModule so
 * use cases each depend only on the narrow port they actually need.
 */

import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { ContactMe } from '../../../../domain/entities/ContactMe'
import type { IContactWriteRepository } from '../../../../domain/repositories/contact/IContactWriteRepository'
import type { IContactReadRepository } from '../../../../domain/repositories/contact/IContactReadRepository'
import { PrismaService } from '../../prisma/prisma.service'

const CONTACT_SELECT = {
    id:          true,
    name:        true,
    email:       true,
    message:     true,
    ipAddress:   true,
    browserInfo: true,
    createdAt:   true,
} as const

type ContactRow = Prisma.ContactMeGetPayload<{ select: typeof CONTACT_SELECT }>

@Injectable()
export class PrismaContactRepository
    implements IContactWriteRepository, IContactReadRepository
{
    constructor(private readonly prisma: PrismaService) {}

    // ──────────────────────────────────────────────────────────────────────────
    // Private mapper — single source of truth for ContactMe construction
    // ──────────────────────────────────────────────────────────────────────────

    private static toDomain(row: ContactRow): ContactMe {
        return new ContactMe(
            row.id,
            row.name,
            row.email,
            row.message,
            row.ipAddress,
            row.browserInfo,
            row.createdAt,
        )
    }

    // ──────────────────────────────────────────────────────────────────────────
    // IContactWriteRepository
    // ──────────────────────────────────────────────────────────────────────────

    // O(1) — insert, PK auto-generated
    async save(data: Omit<ContactMe, 'id'>): Promise<ContactMe> {
        const row = await this.prisma.client.contactMe.create({
            data: {
                name:        data.name,
                email:       data.email,
                message:     data.message,
                ipAddress:   data.ipAddress,
                browserInfo: data.browserInfo,
                // createdAt set by DB default — never trust client-provided timestamps
            },
            select: CONTACT_SELECT,
        })
        return PrismaContactRepository.toDomain(row)
    }

    // O(1) — delete by PK
    // Returns true if a row was deleted, false if no row found with that id.
    async delete(id: number): Promise<boolean> {
        try {
            await this.prisma.client.contactMe.delete({ where: { id } })
            return true
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                return false
            }
            throw error
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // IContactReadRepository
    // ──────────────────────────────────────────────────────────────────────────

    // O(n) — full table scan with index-ordered createdAt desc
    async findAll(): Promise<ContactMe[]> {
        const rows = await this.prisma.client.contactMe.findMany({
            select:  CONTACT_SELECT,
            orderBy: { createdAt: 'desc' },
        })
        return rows.map(PrismaContactRepository.toDomain)
    }

    // O(1) — PK lookup
    async findById(id: number): Promise<ContactMe | null> {
        const row = await this.prisma.client.contactMe.findUnique({
            where:  { id },
            select: CONTACT_SELECT,
        })
        return row ? PrismaContactRepository.toDomain(row) : null
    }
}