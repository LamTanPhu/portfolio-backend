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

    const adapter = new PrismaPg({
      connectionString: databaseUrl,
      max: 10,
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

          await Promise.all(
              Array.from({ length: 5 }, () => this.prisma.$queryRaw`SELECT 1`)
          )

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