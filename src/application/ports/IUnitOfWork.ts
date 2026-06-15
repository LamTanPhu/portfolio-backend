import type { PrismaClient } from '@prisma/client'

// =============================================================================
// IUnitOfWork
// Application port for atomic multi-repo database transactions.
//
// The transactional PrismaClient (tx) is passed into the callback so every
// repository operation inside the function runs on the same connection and
// is rolled back atomically if anything throws.
//
// Usage:
//   await uow.transaction(async (tx) => {
//     await blogRepo.create(data, tx)
//     await pageViewRepo.increment('/blog/new-post', tx)
//   })
//
// Repos that receive `tx` use it instead of the global client. Repos that
// don't need to participate in the transaction simply ignore it.
//
// begin/commit/rollback are intentional no-ops — Prisma's interactive
// transactions manage the lifecycle internally via $transaction().
// =============================================================================
export type TransactionalClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

export interface IUnitOfWork {
  begin(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  transaction<T>(fn: (tx: TransactionalClient) => Promise<T>): Promise<T>
}