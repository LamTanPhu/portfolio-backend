import { Injectable, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { ITokenRepository } from '../ports/ITokenRepository'
import { UnauthorizedError } from '../../domain/errors/UnauthorizedError'
import { ValidationError } from '../../domain/errors/ValidationError'
import * as crypto from 'crypto'

// =============================================================================
// Token Payload Shape
// =============================================================================
export interface AccessTokenPayload {
    sub: number          // user id
    role: 'admin'
    jti: string          // unique token id — used for revocation
    fingerprint: string  // browser fingerprint hash — ties token to device
    iss: string
    aud: string
}

export interface RefreshTokenPayload {
    sub: number
    jti: string
    type: 'refresh'
}

// =============================================================================
// AuthService
// Handles login, logout, token refresh, fingerprint binding.
// Lives in application/services — orchestrates ports, no HTTP knowledge.
// =============================================================================
@Injectable()
export class AuthService {
    // Access token: 15 minutes — short window minimizes stolen token damage
    private static readonly ACCESS_TOKEN_EXPIRY  = '15m'
    private static readonly ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000

    // Refresh token: 7 days — stored in httpOnly cookie, not accessible to JS
    private static readonly REFRESH_TOKEN_EXPIRY    = '7d'
    private static readonly REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

    constructor(
        private readonly jwt: JwtService,
        @Inject('ITokenRepository')
        private readonly tokenRepo: ITokenRepository,
    ) {}

    // ===========================================================================
    // Login
    // Verifies password, issues access + refresh token pair.
    // Password compared via timing-safe method — prevents timing attacks.
    // ===========================================================================
    async login(
        password: string,
        fingerprint: string,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const adminPassword = process.env.ADMIN_PASSWORD
        if (!adminPassword) {
        throw new Error('[AuthService] ADMIN_PASSWORD is not set')
        }

        // Timing-safe comparison — prevents timing attacks on password check
        const inputBuffer  = Buffer.from(password)
        const targetBuffer = Buffer.from(adminPassword)

        const isValid =
        inputBuffer.length === targetBuffer.length &&
        crypto.timingSafeEqual(inputBuffer, targetBuffer)

        if (!isValid) throw new UnauthorizedError('Invalid credentials')

        const accessToken  = await this.issueAccessToken(1, fingerprint)
        const refreshToken = await this.issueRefreshToken(1)

        return { accessToken, refreshToken }
    }

    // ===========================================================================
    // Refresh
    // Validates refresh token from httpOnly cookie, issues new access token.
    // ===========================================================================
    async refresh(
        refreshToken: string,
        fingerprint: string,
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

        const accessToken = await this.issueAccessToken(payload.sub, fingerprint)
        return { accessToken }
    }

    // ===========================================================================
    // Logout
    // Revokes current access token jti — replay attacks blocked immediately.
    // ===========================================================================
    async logout(jti: string): Promise<void> {
        const expiresAt = new Date(Date.now() + AuthService.ACCESS_TOKEN_EXPIRY_MS)
        await this.tokenRepo.revoke(jti, expiresAt)
    }

    // ===========================================================================
    // Verify Access Token
    // Validates signature, expiry, revocation, and fingerprint binding.
    // ===========================================================================
    async verifyAccessToken(
        token: string,
        fingerprint: string,
    ): Promise<AccessTokenPayload> {
        let payload: AccessTokenPayload

        try {
        payload = await this.jwt.verifyAsync<AccessTokenPayload>(token)
        } catch {
        throw new UnauthorizedError('Invalid or expired token')
        }

        // Check token has not been explicitly revoked (logout)
        const revoked = await this.tokenRepo.isRevoked(payload.jti)
        if (revoked) throw new UnauthorizedError('Token has been revoked')

        // Fingerprint check — token stolen from different device is rejected
        if (payload.fingerprint !== fingerprint) {
        throw new UnauthorizedError('Token fingerprint mismatch')
        }

        return payload
    }

    // ===========================================================================
    // Fingerprint
    // Hash of User-Agent + IP — ties token to the browser that logged in.
    // One-way hash — original values never stored.
    // ===========================================================================
    static buildFingerprint(userAgent: string, ip: string): string {
        return crypto
        .createHash('sha256')
        .update(`${userAgent}:${ip}`)
        .digest('hex')
    }

    // ===========================================================================
    // Private Helpers
    // ===========================================================================
    private async issueAccessToken(
        userId: number,
        fingerprint: string,
    ): Promise<string> {
        const jti = crypto.randomUUID()
        return this.jwt.signAsync(
        {
            sub: userId,
            role: 'admin' as const,
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
            sub: userId,
            jti,
            type: 'refresh' as const,
        },
        { expiresIn: AuthService.REFRESH_TOKEN_EXPIRY },
        )
    }

    static getRefreshTokenExpiryMs(): number {
        return AuthService.REFRESH_TOKEN_EXPIRY_MS
    }
}