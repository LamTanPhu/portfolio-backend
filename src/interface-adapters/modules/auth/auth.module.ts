import { Module } from '@nestjs/common'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { AuthController } from './auth.controller'
import { AuthService } from '../../../application/services/AuthService'
import { PrismaRevokedTokenRepository } from '../../../infrastructure/database/repositories/PrismaRevokedTokenRepository'

// =============================================================================
// AuthModule
// Central authentication module responsible for token issuance, validation,
// refresh, and revocation.
//
// Design Decisions:
// - JwtModule.registerAsync() is used to safely read JWT_SECRET from .env at runtime.
// - Factory pattern for AuthService maintains clean dependency injection.
// - Repository abstraction ('ITokenRepository') allows future swapping of storage.
// =============================================================================
@Module({
    imports: [
        // JwtModule must be configured with secret + sign options
        JwtModule.registerAsync({
            useFactory: () => ({
                secret: process.env.JWT_SECRET,
                signOptions: {
                    expiresIn: '15m',           // Matches AuthService.ACCESS_TOKEN_EXPIRY
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [
        PrismaRevokedTokenRepository,

        // Token Repository Abstraction
        {
            provide: 'ITokenRepository',
            useExisting: PrismaRevokedTokenRepository,
        },

        // AuthService Factory
        {
            provide: AuthService,
            useFactory: (
                jwtService: JwtService,
                tokenRepository: PrismaRevokedTokenRepository,
            ) => new AuthService(jwtService, tokenRepository),
            inject: [JwtService, PrismaRevokedTokenRepository],
        },
    ],
    exports: [AuthService],
})
export class AuthModule {}