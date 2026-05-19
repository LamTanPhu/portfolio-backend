/**
 * @fileoverview PrismaModule
 * 
 * Global module providing PrismaService across the entire application.
 * Should be imported only once in AppModule.
 */

import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { PrismaService } from './prisma.service'

@Global()
@Module({
    imports: [ConfigModule],
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule {}