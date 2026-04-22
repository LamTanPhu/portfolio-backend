import { Module } from '@nestjs/common'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { AuthController } from './auth.controller'
import { AuthService } from '../../../application/services/AuthService'
import { PrismaRevokedTokenRepository } from '../../../infrastructure/database/repositories/PrismaRevokedTokenRepository'

// =============================================================================
// AuthModule
// Handles login, logout, token refresh.
// Exports AuthService — JwtAuthGuard in feature modules depends on it.
// JwtModule imported explicitly — useFactory needs JwtService injected.
// =============================================================================
@Module({
    imports: [JwtModule],
    controllers: [AuthController],
    providers: [
        PrismaRevokedTokenRepository,
        {
        provide:    'ITokenRepository',
        useExisting: PrismaRevokedTokenRepository,
        },
        {
        provide:    AuthService,
        useFactory: (jwt: JwtService, tokenRepo: PrismaRevokedTokenRepository) =>
            new AuthService(jwt, tokenRepo),
        inject: [JwtService, PrismaRevokedTokenRepository],
        },
    ],
    // AuthService exported — available in any module that imports AuthModule
    exports: [AuthService],
})
export class AuthModule {}