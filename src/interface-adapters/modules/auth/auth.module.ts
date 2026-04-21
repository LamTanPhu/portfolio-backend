import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from '../../../application/services/AuthService'
import { PrismaRevokedTokenRepository } from '../../../infrastructure/database/repositories/PrismaRevokedTokenRepository'

@Module({
    controllers: [AuthController],
    providers: [
        PrismaRevokedTokenRepository,
        {
        provide: 'ITokenRepository',
        useExisting: PrismaRevokedTokenRepository,
        },
        {
        provide: AuthService,
        useFactory: (jwt: any, tokenRepo: PrismaRevokedTokenRepository) =>
            new AuthService(jwt, tokenRepo),
        inject: ['JwtService', PrismaRevokedTokenRepository],
        },
    ],
    // Export AuthService — JwtAuthGuard in other modules needs it
    exports: [AuthService],
})
export class AuthModule {}