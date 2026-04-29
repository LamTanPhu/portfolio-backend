import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { UserController } from './user.controller'
import { GetUserProfileQuery } from '../../../application/use-cases/queries/user/GetUserProfileQuery'
import { UpdateUserProfileCommand } from '../../../application/use-cases/commands/user/UpdateUserProfileCommand'
import { PrismaUserRepository } from '../../../infrastructure/database/repositories/PrismaUserRepository'

// =============================================================================
// UserModule
// Admin only — all endpoints protected by JwtAuthGuard at controller level.
// PrismaUserRepository implements both read and write interfaces.
// =============================================================================
@Module({
  imports: [AuthModule],
  controllers: [UserController],
  providers: [
    // ─── Repositories ───────────────────────────────────────────────────────
    PrismaUserRepository,
    { provide: 'IUserReadRepository',  useExisting: PrismaUserRepository },
    { provide: 'IUserWriteRepository', useExisting: PrismaUserRepository },

    // ─── Use cases ──────────────────────────────────────────────────────────
    {
      provide:    GetUserProfileQuery,
      useFactory: (repo: PrismaUserRepository) =>
        new GetUserProfileQuery(repo),
      inject: [PrismaUserRepository],
    },
    {
      provide:    UpdateUserProfileCommand,
      useFactory: (repo: PrismaUserRepository) =>
        new UpdateUserProfileCommand(repo),
      inject: [PrismaUserRepository],
    },
  ],
})
export class UserModule {}