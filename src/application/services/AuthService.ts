import { Injectable, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as crypto from 'crypto'
import type { ITokenRepository } from '../ports/ITokenRepository'
import { UnauthorizedError } from '../../domain/errors/UnauthorizedError'

// =============================================================================
// Token Payload Shapes
// Strict interfaces for JWT payloads.
// =============================================================================
export interface AccessTokenPayload {
    sub:         number           // User ID
    role:        'admin'
    jti:         string           // Token ID for revocation
    fingerprint: string           // Device fingerprint binding
    iss:         string
    aud:         string | string[]
}

export interface RefreshTokenPayload {
    sub:  number
    jti:  string
    type: 'refresh'
}

// =============================================================================
// AuthService
// Responsible for all JWT token lifecycle operations.
// Security-first design with configurable fingerprint enforcement.
// =============================================================================
@Injectable()
export class AuthService {
    private static readonly ACCESS_TOKEN_EXPIRY    = '15m'
    private static readonly ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1_000

    private static readonly REFRESH_TOKEN_EXPIRY    = '7d'
    private static readonly REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1_000

    constructor(
        private readonly jwt: JwtService,
        @Inject('ITokenRepository')
        private readonly tokenRepo: ITokenRepository,
    ) {}

    // ===========================================================================
    // Login
    // ===========================================================================
    async login(
        password:    string,
        fingerprint: string,
        userId:      number,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const adminPassword = process.env.ADMIN_PASSWORD
        if (!adminPassword) {
            throw new Error('[AuthService] ADMIN_PASSWORD environment variable is not set')
        }

        const inputBuffer  = Buffer.from(password)
        const targetBuffer = Buffer.from(adminPassword)

        const isValid =
            inputBuffer.length === targetBuffer.length &&
            crypto.timingSafeEqual(inputBuffer, targetBuffer)

        if (!isValid) {
            throw new UnauthorizedError('Invalid credentials')
        }

        const [accessToken, refreshToken] = await Promise.all([
            this.issueAccessToken(userId, fingerprint),
            this.issueRefreshToken(userId),
        ])

        return { accessToken, refreshToken }
    }

    // ===========================================================================
    // Refresh Token
    // ===========================================================================
    async refresh(
        refreshToken: string,
        fingerprint:  string,
    ): Promise<{ accessToken: string }> {
        let payload: RefreshTokenPayload

        try {
            payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken)
        } catch {
            throw new UnauthorizedError('Invalid refresh token')
        }

        if (payload.type !== 'refresh') {
            throw new UnauthorizedError('Invalid token type')
        }

        const revoked = await this.tokenRepo.isRevoked(payload.jti)
        if (revoked) throw new UnauthorizedError('Token has been revoked')

        return { accessToken: await this.issueAccessToken(payload.sub, fingerprint) }
    }

    // ===========================================================================
    // Logout
    // ===========================================================================
    async logout(jti: string): Promise<void> {
        const expiresAt = new Date(Date.now() + AuthService.ACCESS_TOKEN_EXPIRY_MS)
        await this.tokenRepo.revoke(jti, expiresAt)
    }

    // ===========================================================================
    // Verify Access Token — Core Security Check
    // ===========================================================================
    async verifyAccessToken(
        token:       string,
        fingerprint: string,
    ): Promise<AccessTokenPayload> {
        let payload: AccessTokenPayload

        try {
            payload = await this.jwt.verifyAsync<AccessTokenPayload>(token)
        } catch {
            throw new UnauthorizedError('Invalid or expired token')
        }

        // Revocation check
        const revoked = await this.tokenRepo.isRevoked(payload.jti)
        if (revoked) {
            throw new UnauthorizedError('Token has been revoked')
        }

        // Fingerprint enforcement (STRICT by default)
        if (this.shouldEnforceFingerprint()) {
            if (payload.fingerprint !== fingerprint) {
                throw new UnauthorizedError('Token fingerprint mismatch')
            }
        }

        return payload
    }

    // ===========================================================================
    // Fingerprint Enforcement Logic
    // STRICT by default in all environments.
    // You can disable it by setting FINGERPRINT_STRICT=false in .env
    // ===========================================================================
    private shouldEnforceFingerprint(): boolean {
        if (process.env.FINGERPRINT_STRICT === 'false') {
            return false
        }
        return true // Strict by default (production + development)
    }

    // ===========================================================================
    // Fingerprint Builder
    // ===========================================================================
    static buildFingerprint(userAgent: string, ip: string): string {
        return crypto
            .createHash('sha256')
            .update(`${userAgent}:${ip}`)
            .digest('hex')
    }

    static getRefreshTokenExpiryMs(): number {
        return AuthService.REFRESH_TOKEN_EXPIRY_MS
    }

    // ===========================================================================
    // Token Issuers
    // ===========================================================================
    private async issueAccessToken(
        userId:      number,
        fingerprint: string,
    ): Promise<string> {
        const jti = crypto.randomUUID()

        return this.jwt.signAsync(
            {
                sub:         userId,
                role:        'admin' as const,
                jti,
                fingerprint,
            },
            { expiresIn: AuthService.ACCESS_TOKEN_EXPIRY },
        )
    }

    private async issueRefreshToken(userId: number): Promise<string> {
        const jti = crypto.randomUUID()

        return this.jwt.signAsync(
            {
                sub:  userId,
                jti,
                type: 'refresh' as const,
            },
            { expiresIn: AuthService.REFRESH_TOKEN_EXPIRY },
        )
    }
}