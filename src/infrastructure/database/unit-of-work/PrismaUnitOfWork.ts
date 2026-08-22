import { Injectable } from '@nestjs/common'
import type { IUnitOfWork, TransactionalClient } from '../../../application/ports/IUnitOfWork'
import { PrismaService } from '../prisma/prisma.service'

// =============================================================================
// PrismaUnitOfWork
//
// Implements IUnitOfWork using Prisma's interactive transaction API.
//
// The key fix over the previous implementation: the transactional PrismaClient
// (tx) is now passed into the callback. Repositories that receive `tx` and use
// it for their queries are fully atomic — if any operation throws, Prisma rolls
// back every write that happened inside the transaction block automatically.
//
// Repos that don't need transactions continue to work unchanged — they keep
// using `PrismaService.client` as their default, and only switch to `tx` when
// one is explicitly passed to them.
//
// Usage in a command:
//   await this.uow.transaction(async (tx) => {
//     await this.blogRepo.create(data, tx)          // uses tx → atomic
//     await this.viewRepo.increment(slug, tx)        // uses tx → atomic
//   })
//   // if blogRepo.create throws → viewRepo.increment is rolled back too
//
// begin/commit/rollback remain intentional no-ops — Prisma manages the
// transaction lifecycle internally; callers never need to call them.
// =============================================================================
@Injectable()
export class PrismaUnitOfWork implements IUnitOfWork {
    constructor(private readonly prisma: PrismaService) {}

    // Intentional no-ops — Prisma $transaction handles the full lifecycle
    async begin(): Promise<void> {}
    async commit(): Promise<void> {}
    async rollback(): Promise<void> {}

    async transaction<T>(fn: (tx: TransactionalClient) => Promise<T>): Promise<T> {
        return this.prisma.client.$transaction((tx) => fn(tx), {
            // Max time Prisma waits to acquire a connection from the pool
            maxWait: 5000,
            // Max time the entire transaction block is allowed to run
            timeout: 10000,
        })
    }
}
