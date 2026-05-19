/**
 * @fileoverview UserModule
 * 
 * Manages admin user profile (view + update).
 * Uses split Read/Write repositories for better separation of concerns.
 */

import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'

import { UserController } from './user.controller'

// Use Cases
import { GetUserProfileQuery } from '../../../application/use-cases/queries/user/GetUserProfileQuery'
import { UpdateUserProfileCommand } from '../../../application/use-cases/commands/user/UpdateUserProfileCommand'

// Repositories
import { PrismaUserReadRepository } from '../../../infrastructure/database/repositories/user/PrismaUserReadRepository'
import { PrismaUserWriteRepository } from '../../../infrastructure/database/repositories/user/PrismaUserWriteRepository'

@Module({
  imports: [AuthModule],

  controllers: [UserController],

  providers: [
    // Repositories
    PrismaUserReadRepository,
    PrismaUserWriteRepository,

    // Ports
    { provide: 'IUserReadRepository', useExisting: PrismaUserReadRepository },
    { provide: 'IUserWriteRepository', useExisting: PrismaUserWriteRepository },

    // Use Cases
    GetUserProfileQuery,
    UpdateUserProfileCommand,
  ],
})
export class UserModule {}