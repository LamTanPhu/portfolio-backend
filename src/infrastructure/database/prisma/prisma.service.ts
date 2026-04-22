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
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'stdout', level: 'query' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  })

  return prisma
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

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

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}