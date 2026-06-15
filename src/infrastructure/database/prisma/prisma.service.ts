/**
 * @fileoverview PrismaService - Optimized & Stable
 * 
 * Clean, performant PrismaClient with good connection handling.
 * Avoids type conflicts while maintaining solid performance.
 */

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)
  private readonly prisma: PrismaClient

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = this.configService.get<string>('DATABASE_URL')
    if (!databaseUrl) {
      throw new Error('[PrismaService] DATABASE_URL environment variable is not set')
    }

    // Pool size defaults to 10 — enough for a portfolio workload.
    // Set DATABASE_POOL_SIZE to tune for your hosting tier (e.g. 3 on free-tier PaaS).
    const poolSize = parseInt(this.configService.get<string>('DATABASE_POOL_SIZE') ?? '10', 10)

    const adapter = new PrismaPg({
      connectionString: databaseUrl,
      max: poolSize,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    this.prisma = new PrismaClient({
      adapter,
      log: this.configService.get<string>('NODE_ENV') === 'development'
        ? [
            { emit: 'stdout', level: 'query' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
      transactionOptions: {
        maxWait: 5000,
        timeout: 10000,
      },
    })
  }

  get client(): PrismaClient {
    return this.prisma
  }

  async onModuleInit(): Promise<void> {
      try {
          await this.prisma.$connect()

          // Single connectivity probe — $connect() already opens the first
          // connection; one SELECT 1 confirms the DB is reachable without
          // burning 4 extra pool slots on startup for no gain.
          await this.prisma.$queryRaw`SELECT 1`

          this.logger.log('Prisma Database connected successfully')
      } catch (error) {
          this.logger.error('Failed to connect to database', error)
          throw error
      }
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect()
    this.logger.log('Prisma disconnected')
  }
}