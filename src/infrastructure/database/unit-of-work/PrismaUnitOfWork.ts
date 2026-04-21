import { Injectable } from '@nestjs/common'
import type { IUnitOfWork } from '../../../application/ports/IUnitOfWork'
import { PrismaService } from '../prisma/prisma.service'

// =============================================================================
// PrismaUnitOfWork
// Wraps Prisma's $transaction for atomic multi-operation writes.
// begin/commit/rollback are no-ops — Prisma handles atomicity internally.
// Use transaction() for any operation that must succeed or fail together.
//
// Example:
//   await uow.transaction(async () => {
//     await repo.create(blogData)
//     await analytics.increment('/blog/my-post')
//   })
// =============================================================================
@Injectable()
export class PrismaUnitOfWork implements IUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  // No-ops — Prisma $transaction handles begin/commit/rollback automatically
  async begin(): Promise<void> {}
  async commit(): Promise<void> {}
  async rollback(): Promise<void> {}

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    return this.prisma.client.$transaction(fn)
  }
}