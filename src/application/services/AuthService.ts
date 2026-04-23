import { Injectable, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as crypto from 'crypto'
import type { ITokenRepository } from '../ports/ITokenRepository'
import { UnauthorizedError } from '../../domain/errors/UnauthorizedError'

// =============================================================================
// Token Payload Shapes
// Strict interfaces — never use any or unknown for JWT payloads.
// iss and aud verified by JwtModule.register() verifyOptions — not checked here.
// =============================================================================
export interface AccessTokenPayload {
    sub:         number    // user id — extracted by controllers for writes
    role:        'admin'
    jti:         string    // unique token id — used for revocation blacklist
    fingerprint: string    // SHA-256 hash of User-Agent + IP — device binding
    iss:         string
    aud:         string | string[]
}

export interface RefreshTokenPayload {
    sub:  number
    jti:  string
    type: 'refresh'        // explicit type claim — prevents access token used as refresh
}

// =============================================================================
// AuthService
// Single responsibility: token lifecycle management.
// Handles login, logout, refresh, fingerprint binding, revocation checks.
// Lives in application/services — orchestrates ports, zero HTTP knowledge.
// Password never hashed — single admin, compared via timing-safe equality.
// =============================================================================
@Injectable()
export class AuthService {
    // Access token: 15 minutes — short window minimizes stolen token damage
    private static readonly ACCESS_TOKEN_EXPIRY    = '15m'
    private static readonly ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1_000

    // Refresh token: 7 days — stored in httpOnly cookie, inaccessible to JS
    private static readonly REFRESH_TOKEN_EXPIRY    = '7d'
    private static readonly REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1_000

    constructor(
        private readonly jwt: JwtService,
        @Inject('ITokenRepository')
        private readonly tokenRepo: ITokenRepository,
    ) {}

    // ===========================================================================
    // Login
    // Verifies password via timing-safe comparison — prevents timing attacks.
    // userId passed in — not hardcoded — caller provides the authenticated user id.
    // Issues access + refresh token pair on success.
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

        // Timing-safe comparison — prevents timing attacks on password check
        // Buffer lengths must match before timingSafeEqual or it throws
        const inputBuffer  = Buffer.from(password)
        const targetBuffer = Buffer.from(adminPassword)

        const isValid =
            inputBuffer.length === targetBuffer.length &&
            crypto.timingSafeEqual(inputBuffer, targetBuffer)

        if (!isValid) throw new UnauthorizedError('Invalid credentials')

        const [accessToken, refreshToken] = await Promise.all([
            this.issueAccessToken(userId, fingerprint),
            this.issueRefreshToken(userId),
        ])

        return { accessToken, refreshToken }
    }

    // ===========================================================================
    // Refresh
    // Validates refresh token from httpOnly cookie.
    // Issues new access token — refresh token itself is not rotated.
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

        // Explicit type check — prevents access token being used as refresh token
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
    // Adds current jti to revocation blacklist — replay attacks blocked immediately.
    // Token remains cryptographically valid but isRevoked() returns true.
    // ===========================================================================
    async logout(jti: string): Promise<void> {
        const expiresAt = new Date(Date.now() + AuthService.ACCESS_TOKEN_EXPIRY_MS)
        await this.tokenRepo.revoke(jti, expiresAt)
    }

    // ===========================================================================
    // Verify Access Token
    // Full validation chain:
    //   1. Signature + expiry (JwtService)
    //   2. Revocation check (tokenRepo)
    //   3. Fingerprint match (device binding)
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

        // Revocation check — O(1) lookup via indexed jti column
        const revoked = await this.tokenRepo.isRevoked(payload.jti)
        if (revoked) throw new UnauthorizedError('Token has been revoked')

        // Fingerprint check — token stolen from different device is rejected
        if (payload.fingerprint !== fingerprint) {
            throw new UnauthorizedError('Token fingerprint mismatch')
        }

        return payload
    }

    // ===========================================================================
    // Fingerprint Builder
    // SHA-256 hash of User-Agent + IP — ties token to the browser that logged in.
    // One-way hash — original values never stored anywhere.
    // Static — callable without AuthService instance (used in guards + controllers).
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
    // Private Token Issuers
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