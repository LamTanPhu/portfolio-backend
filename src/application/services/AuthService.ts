/**
 * @fileoverview AuthService
 * 
 * Handles all JWT token lifecycle operations with security-first design.
 * Uses short-lived cache for revocation checks to reduce database pressure.
 */

import { Injectable, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as crypto from 'crypto'
import type { ITokenRepository } from '../ports/ITokenRepository'
import type { ICacheQueryService } from '../ports/ICacheQueryService'
import { UnauthorizedError } from '../../domain/errors/UnauthorizedError'

export interface AccessTokenPayload {
    sub:         number
    role:        'admin'
    jti:         string
    fingerprint: string
    iss:         string
    aud:         string | string[]
}

export interface RefreshTokenPayload {
    sub:  number
    jti:  string
    type: 'refresh'
}

@Injectable()
export class AuthService {
    private static readonly ACCESS_TOKEN_EXPIRY    = '15m'
    private static readonly REFRESH_TOKEN_EXPIRY    = '7d'
    private static readonly REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

    constructor(
        private readonly jwt: JwtService,

        @Inject('ITokenRepository')
        private readonly tokenRepo: ITokenRepository,

        @Inject('ICacheQueryService')
        private readonly cacheQuery: ICacheQueryService,
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

        const isValid = crypto.timingSafeEqual(
        Buffer.from(password),
        Buffer.from(adminPassword)
        )

        if (!isValid) throw new UnauthorizedError('Invalid credentials')

        const [accessToken, refreshToken] = await Promise.all([
        this.issueAccessToken(userId, fingerprint),
        this.issueRefreshToken(userId),
        ])

        return { accessToken, refreshToken }
    }

    // ===========================================================================
    // Refresh Token
    // ===========================================================================
    async refresh(refreshToken: string, fingerprint: string): Promise<{ accessToken: string }> {
        let payload: RefreshTokenPayload

        try {
        payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken)
        } catch {
        throw new UnauthorizedError('Invalid refresh token')
        }

        if (payload.type !== 'refresh') throw new UnauthorizedError('Invalid token type')

        const revoked = await this.isTokenRevoked(payload.jti)
        if (revoked) throw new UnauthorizedError('Token has been revoked')

        return { accessToken: await this.issueAccessToken(payload.sub, fingerprint) }
    }

    // ===========================================================================
    // Logout
    // ===========================================================================
    async logout(jti: string): Promise<void> {
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
        await this.tokenRepo.revoke(jti, expiresAt)
    }

    // ===========================================================================
    // Verify Access Token
    // ===========================================================================
    async verifyAccessToken(token: string, fingerprint: string): Promise<AccessTokenPayload> {
        let payload: AccessTokenPayload

        try {
        payload = await this.jwt.verifyAsync<AccessTokenPayload>(token)
        } catch {
        throw new UnauthorizedError('Invalid or expired token')
        }

        const revoked = await this.isTokenRevoked(payload.jti)
        if (revoked) throw new UnauthorizedError('Token has been revoked')

        if (this.shouldEnforceFingerprint() && payload.fingerprint !== fingerprint) {
        throw new UnauthorizedError('Token fingerprint mismatch')
        }

        return payload
    }

    // ===========================================================================
    // Cached Revocation Check
    // ===========================================================================
    private async isTokenRevoked(jti: string): Promise<boolean> {
        return this.cacheQuery.getOrSetWithProfile(
        `revoked-token:${jti}`,
        'REALTIME',
        async () => await this.tokenRepo.isRevoked(jti),
        )
    }

    private shouldEnforceFingerprint(): boolean {
        return process.env.FINGERPRINT_STRICT !== 'false'
    }

    // ===========================================================================
    // Static Helpers (Used by Controller)
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
    private async issueAccessToken(userId: number, fingerprint: string): Promise<string> {
        const jti = crypto.randomUUID()

        return this.jwt.signAsync(
        { sub: userId, role: 'admin' as const, jti, fingerprint },
        { expiresIn: AuthService.ACCESS_TOKEN_EXPIRY }
        )
    }

    private async issueRefreshToken(userId: number): Promise<string> {
        const jti = crypto.randomUUID()

        return this.jwt.signAsync(
        { sub: userId, jti, type: 'refresh' as const },
        { expiresIn: AuthService.REFRESH_TOKEN_EXPIRY }
        )
    }
}