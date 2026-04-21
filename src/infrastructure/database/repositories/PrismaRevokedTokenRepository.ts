import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { ITokenRepository } from '../../../application/ports/ITokenRepository'

// Batch size for expired token cleanup
// Prevents single massive DELETE from locking the table
const CLEANUP_BATCH_SIZE = 1_000

// =============================================================================
// PrismaRevokedTokenRepository
// jti column has @unique index — isRevoked() is O(1) lookup.
// deleteExpired() batches deletions — prevents table lock on large cleanups.
// select: { jti: true } on isRevoked — fetches minimum possible data.
// =============================================================================
@Injectable()
export class PrismaRevokedTokenRepository implements ITokenRepository {
    constructor(private readonly prisma: PrismaService) {}

  // O(log n) — jti has unique index, Prisma uses index scan
    async revoke(jti: string, expiresAt: Date): Promise<void> {
        await this.prisma.client.revokedToken.create({
        data: { jti, expiresAt },
        })
    }

  // O(1) — jti unique index guarantees single row lookup
  // select: { jti: true } — fetches only the key, zero unnecessary data
    async isRevoked(jti: string): Promise<boolean> {
        const token = await this.prisma.client.revokedToken.findUnique({
        where:  { jti },
        select: { jti: true },
        })
        return token !== null
    }

  // Batched deletion — prevents table lock on large expired token sets
  // Each batch is a separate query — other queries can proceed between batches
  // Called on a schedule (daily) — not on hot path
    async deleteExpired(): Promise<void> {
        const now = new Date()

        while (true) {
        // Find a batch of expired token ids first
        const batch = await this.prisma.client.revokedToken.findMany({
            where:  { expiresAt: { lt: now } },
            select: { id: true },
            take:   CLEANUP_BATCH_SIZE,
        })

        // No more expired tokens — done
        if (batch.length === 0) break

        const ids = batch.map((r) => r.id)

        await this.prisma.client.revokedToken.deleteMany({
            where: { id: { in: ids } },
        })

        // All expired tokens processed in this run
        if (batch.length < CLEANUP_BATCH_SIZE) break
        }
    }
}