import { Injectable } from '@nestjs/common'
import type { IUnitOfWork } from '../../../application/ports/IUnitOfWork'
import { PrismaService } from '../prisma/prisma.service'

// =============================================================================
// PrismaUnitOfWork
// Implements IUnitOfWork using Prisma's $transaction API.
// begin/commit/rollback are intentional no-ops — Prisma manages atomicity
// internally via $transaction. Callers always use transaction() directly.
//
// Usage:
//   await uow.transaction(async () => {
//     await blogRepo.create(data)
//     await pageViewRepo.increment('/blog/new-post')
//   })
//
// On error inside fn(): Prisma automatically rolls back — no manual rollback needed.
// =============================================================================
@Injectable()
export class PrismaUnitOfWork implements IUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  // Intentional no-ops — Prisma $transaction handles lifecycle automatically
  async begin(): Promise<void>    {}
  async commit(): Promise<void>   {}
  async rollback(): Promise<void> {}

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    return this.prisma.client.$transaction(fn)
  }
}