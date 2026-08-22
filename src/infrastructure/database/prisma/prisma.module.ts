/**
 * @fileoverview PrismaModule
 *
 * Global module providing PrismaService across the entire application.
 * Should be imported only once in AppModule.
 *
 * Also provides IUnitOfWork (PrismaUnitOfWork) for commands that need to
 * write across more than one repository atomically — see AuthService.logout()
 * for the current example (revoking both the access and refresh token in a
 * single transaction).
 */

import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { PrismaService } from './prisma.service'
import { PrismaUnitOfWork } from '../unit-of-work/PrismaUnitOfWork'

@Global()
@Module({
    imports: [ConfigModule],
    providers: [PrismaService, PrismaUnitOfWork, { provide: 'IUnitOfWork', useExisting: PrismaUnitOfWork }],
    exports: [PrismaService, { provide: 'IUnitOfWork', useExisting: PrismaUnitOfWork }],
})
export class PrismaModule {}
