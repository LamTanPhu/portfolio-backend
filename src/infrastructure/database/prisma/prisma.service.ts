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
  private prisma: PrismaClient | null = null

  constructor(private readonly configService: ConfigService) {}

  get client(): PrismaClient {
    if (!this.prisma) {
      this.initializeClient()
    }
    return this.prisma!
  }

  private initializeClient(): void {
    const databaseUrl = this.configService.get<string>('DATABASE_URL')
    if (!databaseUrl) {
      throw new Error('[PrismaService] DATABASE_URL environment variable is not set')
    }

    const adapter = new PrismaPg({ connectionString: databaseUrl })

    this.prisma = new PrismaClient({
      adapter,

      log: this.configService.get<string>('NODE_ENV') === 'development'
        ? [
            { emit: 'stdout', level: 'query' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : [{ emit: 'stdout', level: 'error' }],

      // Performance options that are safe with PrismaPg
      transactionOptions: {
        maxWait: 5000,
        timeout: 10000,
      },
    })
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.$connect()
      this.logger.log('Prisma Database connected successfully')
    } catch (error) {
      this.logger.error('Failed to connect to database', error)
      throw error
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect()
      this.logger.log('Prisma disconnected')
    }
  }
}