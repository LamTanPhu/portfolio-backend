import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule, JwtService } from '@nestjs/jwt'

import { AuthService } from '../../../application/services/AuthService'
import { AuthController } from './auth.controller'

// Infrastructure
import { CACHE_QUERY_SERVICE } from '../../../application/ports/cache.tokens'
import type { ICacheQueryService } from '../../../application/ports/ICacheQueryService'
import type { IUnitOfWork } from '../../../application/ports/IUnitOfWork'
import { CacheInfrastructureModule } from '../../../infrastructure/cache/cache.module'
import { PrismaRevokedTokenRepository } from '../../../infrastructure/database/repositories/PrismaRevokedTokenRepository'
import { PrismaAdminCredentialRepository } from '../../../infrastructure/database/repositories/user/PrismaAdminCredentialRepository'
import { PrismaUserWriteRepository } from '../../../infrastructure/database/repositories/user/PrismaUserWriteRepository'

@Module({
    imports: [
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: '15m',
                    issuer: AuthService.ISSUER,
                    audience: AuthService.AUDIENCE,
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

        { provide: 'ITokenRepository', useExisting: PrismaRevokedTokenRepository },
        { provide: 'IUserWriteRepository', useExisting: PrismaUserWriteRepository },
        { provide: 'IAdminCredentialRepository', useExisting: PrismaAdminCredentialRepository },

        // AuthService with all 7 dependencies.
        // useFactory is required here because AuthService mixes @Inject() token
        // decorators with a plain ConfigService dependency — NestJS cannot resolve
        // that combination automatically via @Injectable() alone in this module.
        {
            provide: AuthService,
            useFactory: (
                jwtService: JwtService,
                tokenRepository: PrismaRevokedTokenRepository,
                cacheQueryService: ICacheQueryService,
                userWriteRepository: PrismaUserWriteRepository,
                credentialRepository: PrismaAdminCredentialRepository,
                unitOfWork: IUnitOfWork,
                configService: ConfigService,
            ) =>
                new AuthService(
                    jwtService,
                    tokenRepository,
                    cacheQueryService,
                    userWriteRepository,
                    credentialRepository,
                    unitOfWork,
                    configService,
                ),
            inject: [
                JwtService,
                'ITokenRepository',
                CACHE_QUERY_SERVICE,
                'IUserWriteRepository',
                'IAdminCredentialRepository',
                'IUnitOfWork',
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
