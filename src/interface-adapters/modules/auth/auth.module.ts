import { Module } from '@nestjs/common'
import { JwtModule, JwtService } from '@nestjs/jwt'

import { AuthController } from './auth.controller'
import { AuthService } from '../../../application/services/AuthService'

// Infrastructure
import { PrismaRevokedTokenRepository } from '../../../infrastructure/database/repositories/PrismaRevokedTokenRepository'
import { PrismaUserWriteRepository } from '../../../infrastructure/database/repositories/user/PrismaUserWriteRepository'
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
        PrismaUserWriteRepository,

        { provide: 'ITokenRepository',    useExisting: PrismaRevokedTokenRepository },
        { provide: 'IUserWriteRepository', useExisting: PrismaUserWriteRepository   },

        // AuthService with all 4 dependencies
        {
        provide: AuthService,
        useFactory: (
            jwtService: JwtService,
            tokenRepository: PrismaRevokedTokenRepository,
            cacheQueryService: any,           // ICacheQueryService
            userWriteRepository: PrismaUserWriteRepository,
        ) => new AuthService(jwtService, tokenRepository, cacheQueryService, userWriteRepository),
        inject: [JwtService, 'ITokenRepository', 'ICacheQueryService', 'IUserWriteRepository'],
        },
    ],

    exports: [
        AuthService,
        PrismaRevokedTokenRepository,
        { provide: 'ITokenRepository', useExisting: PrismaRevokedTokenRepository },
    ],
})
export class AuthModule {}