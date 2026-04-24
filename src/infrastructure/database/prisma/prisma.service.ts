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
// Lazy Singleton Factory
// Client initialized on first access — after ConfigModule loads .env.
// Singleton pattern — one connection pool shared across entire application.
// Throws immediately if DATABASE_URL missing — fail fast, never silent.
// =============================================================================
let prisma: PrismaClient | null = null

function getPrismaClient(): PrismaClient {
  if (prisma) return prisma

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('[PrismaModule] DATABASE_URL environment variable is not set')
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl })

  prisma = new PrismaClient({
    adapter,
    // Query logging in development — off in production for performance
    log: process.env.NODE_ENV === 'development'
      ? [
          { emit: 'stdout', level: 'query' },
          { emit: 'stdout', level: 'warn'  },
          { emit: 'stdout', level: 'error' },
        ]
      : [{ emit: 'stdout', level: 'error' }],
  })

  return prisma
}

// =============================================================================
// PrismaService
// Wraps singleton PrismaClient with NestJS lifecycle hooks.
// client getter — lazy initialization ensures .env is loaded first.
// =============================================================================
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  // Lazy getter — PrismaClient created on first access, not at import time
  get client(): PrismaClient {
    return getPrismaClient()
  }

  async onModuleInit(): Promise<void> {
    await getPrismaClient().$connect()
    this.logger.log('Database connected successfully')
  }

  async onModuleDestroy(): Promise<void> {
    await getPrismaClient().$disconnect()
    this.logger.log('Database disconnected')
  }
}

// =============================================================================
// PrismaModule
// @Global() — PrismaService available everywhere without re-importing.
// Imported once in AppModule — single connection pool, no duplicates.
// =============================================================================
@Global()
@Module({
  providers: [PrismaService],
  exports:   [PrismaService],
})
export class PrismaModule {}