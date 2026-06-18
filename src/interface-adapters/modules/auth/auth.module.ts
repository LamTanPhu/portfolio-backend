import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule, JwtService } from '@nestjs/jwt'

import { AuthController } from './auth.controller'
import { AuthService } from '../../../application/services/AuthService'

// Infrastructure
import { PrismaRevokedTokenRepository } from '../../../infrastructure/database/repositories/PrismaRevokedTokenRepository'
import { PrismaUserWriteRepository } from '../../../infrastructure/database/repositories/user/PrismaUserWriteRepository'
import { PrismaAdminCredentialRepository } from '../../../infrastructure/database/repositories/user/PrismaAdminCredentialRepository'
import { CacheInfrastructureModule } from '../../../infrastructure/cache/cache.module'

@Module({
    imports: [
        JwtModule.registerAsync({
        inject:     [ConfigService],
        useFactory: (config: ConfigService) => ({
            secret: config.get<string>('JWT_SECRET'),
            signOptions: {
            expiresIn: '15m',
            issuer:    'portfolio-api',
            audience:  'portfolio-admin',
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
        PrismaAdminCredentialRepository,

        { provide: 'ITokenRepository',          useExisting: PrismaRevokedTokenRepository    },
        { provide: 'IUserWriteRepository',       useExisting: PrismaUserWriteRepository       },
        { provide: 'IAdminCredentialRepository', useExisting: PrismaAdminCredentialRepository },

        // AuthService with all 5 dependencies
        {
        provide: AuthService,
        useFactory: (
            jwtService:           JwtService,
            tokenRepository:      PrismaRevokedTokenRepository,
            cacheQueryService:    any,           // ICacheQueryService
            userWriteRepository:  PrismaUserWriteRepository,
            credentialRepository: PrismaAdminCredentialRepository,
        ) => new AuthService(
            jwtService,
            tokenRepository,
            cacheQueryService,
            userWriteRepository,
            credentialRepository,
        ),
        inject: [
            JwtService,
            'ITokenRepository',
            'ICacheQueryService',
            'IUserWriteRepository',
            'IAdminCredentialRepository',
        ],
        },
    ],

    exports: [
        AuthService,
        PrismaRevokedTokenRepository,
        { provide: 'ITokenRepository', useExisting: PrismaRevokedTokenRepository },
    ],
})
export class AuthModule {}