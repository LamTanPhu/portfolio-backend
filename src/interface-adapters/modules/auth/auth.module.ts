/**
 * @fileoverview AuthModule
 * 
 * Central authentication module responsible for token issuance, validation,
 * refresh, and revocation.
 */

import { Module } from '@nestjs/common'
import { JwtModule, JwtService } from '@nestjs/jwt'

import { AuthController } from './auth.controller'
import { AuthService } from '../../../application/services/AuthService'

// Infrastructure
import { PrismaRevokedTokenRepository } from '../../../infrastructure/database/repositories/PrismaRevokedTokenRepository'
import { CacheInfrastructureModule } from '../../../infrastructure/cache/cache.module'

@Module({
    imports: [
        JwtModule.registerAsync({
        useFactory: () => ({
            secret: process.env.JWT_SECRET,
            signOptions: {
            expiresIn: '15m',
            issuer: 'portfolio-api',
            audience: 'portfolio-admin',
            },
        }),
        }),

        // Required because AuthService uses ICacheQueryService
        CacheInfrastructureModule,
    ],

    controllers: [AuthController],

    providers: [
        PrismaRevokedTokenRepository,

        { provide: 'ITokenRepository', useExisting: PrismaRevokedTokenRepository },

        // AuthService with all 3 dependencies
        {
        provide: AuthService,
        useFactory: (
            jwtService: JwtService,
            tokenRepository: PrismaRevokedTokenRepository,
            cacheQueryService: any,           // ICacheQueryService
        ) => new AuthService(jwtService, tokenRepository, cacheQueryService),
        inject: [JwtService, 'ITokenRepository', 'ICacheQueryService'],
        },
    ],

    exports: [AuthService],
})
export class AuthModule {}