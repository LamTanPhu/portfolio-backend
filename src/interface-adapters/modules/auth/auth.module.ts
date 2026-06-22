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
import { CACHE_QUERY_SERVICE } from '../../../application/ports/cache.tokens'
import type { ICacheQueryService } from '../../../application/ports/ICacheQueryService'

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

        // AuthService with all 6 dependencies.
        // useFactory is required here because AuthService mixes @Inject() token
        // decorators with a plain ConfigService dependency — NestJS cannot resolve
        // that combination automatically via @Injectable() alone in this module.
        {
            provide: AuthService,
            useFactory: (
                jwtService:           JwtService,
                tokenRepository:      PrismaRevokedTokenRepository,
                cacheQueryService:    ICacheQueryService,
                userWriteRepository:  PrismaUserWriteRepository,
                credentialRepository: PrismaAdminCredentialRepository,
                configService:        ConfigService,
            ) => new AuthService(
                jwtService,
                tokenRepository,
                cacheQueryService,
                userWriteRepository,
                credentialRepository,
                configService,
            ),
            inject: [
                JwtService,
                'ITokenRepository',
                CACHE_QUERY_SERVICE,
                'IUserWriteRepository',
                'IAdminCredentialRepository',
                ConfigService,
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