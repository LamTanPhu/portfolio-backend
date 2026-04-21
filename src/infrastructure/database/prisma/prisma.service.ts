import {
  Global,
  Injectable,
  Logger,
  Module,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// =============================================================================
// Environment Validation
// Fail fast at startup — never silently run with missing critical config.
// =============================================================================
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('[PrismaModule] DATABASE_URL environment variable is not set')
}

// =============================================================================
// Prisma Client
// Single instance shared across the entire application.
// PrismaPg adapter required by Prisma 7 client engine.
// =============================================================================
const adapter = new PrismaPg({ connectionString: databaseUrl })

const prisma = new PrismaClient({
  adapter,
  log:
    process.env.NODE_ENV === 'development'
      ? [
          { emit: 'stdout', level: 'query' },
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' },
        ]
      : [{ emit: 'stdout', level: 'error' }],
})

// =============================================================================
// PrismaService
// Wraps the singleton PrismaClient.
// Manages connection lifecycle with NestJS module hooks.
// =============================================================================
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  // Expose client directly — callers use this.prisma.client.model
  readonly client = prisma

  async onModuleInit(): Promise<void> {
    await prisma.$connect()
    this.logger.log('Database connected successfully')
  }

  async onModuleDestroy(): Promise<void> {
    await prisma.$disconnect()
    this.logger.log('Database disconnected')
  }
}

// =============================================================================
// PrismaModule
// @Global() — PrismaService is available everywhere without re-importing.
// Imported once in AppModule. No duplicate connections across feature modules.
// =============================================================================
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}