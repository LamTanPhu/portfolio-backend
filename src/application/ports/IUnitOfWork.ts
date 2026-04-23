// =============================================================================
// IUnitOfWork
// Application port for atomic multi-operation database transactions.
// begin/commit/rollback are no-ops in Prisma — use transaction() instead.
// PrismaUnitOfWork wraps prisma.$transaction — caller never touches Prisma.
//
// Usage:
//   await uow.transaction(async () => {
//     await blogRepo.create(data)
//     await analyticsRepo.increment('/blog/my-post')
//   })
// =============================================================================
export interface IUnitOfWork {
  begin(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  transaction<T>(fn: () => Promise<T>): Promise<T>
}