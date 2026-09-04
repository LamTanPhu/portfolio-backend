/**
 * @fileoverview AuthController Unit Tests
 *
 * AuthService is mocked at the instance level (login/refresh/logout) via DI.
 * The two static helpers the controller calls directly — buildFingerprint and
 * getRefreshTokenExpiryMs — are real, deterministic, pure functions (no I/O),
 * so they're left un-mocked and their real output is used as the expected
 * value in assertions, keeping these tests honest about what the controller
 * actually sends AuthService.
 *
 * makeResponse() deliberately returns a loosely-typed plain object rather
 * than something cast to `Response` up front — Express's Response methods
 * are declared with `this`-sensitive method signatures, so referencing
 * `res.cookie` after it's typed as `Response` trips
 * @typescript-eslint/unbound-method. Casting only at the call boundary
 * (asResponse) keeps `res.cookie`/`res.clearCookie` as plain jest mocks
 * everywhere they're asserted on.
 */

import { UnauthorizedException } from '@nestjs/common'
import { GUARDS_METADATA } from '@nestjs/common/constants'
import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import type { Request, Response } from 'express'
import type { AccessTokenPayload } from '../../../application/services/AuthService'
import { AuthService } from '../../../application/services/AuthService'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import { AuthController } from './auth.controller'

const mockAuthService = {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
}

const mockConfigService = {
    get: jest.fn(),
}

const makeRequest = (overrides: Partial<Request> = {}): Request =>
    ({
        ip: '203.0.113.5',
        headers: { 'user-agent': 'Mozilla/5.0' },
        cookies: {},
        ...overrides,
    }) as Request

const makeResponse = () => ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
})

const asResponse = (res: ReturnType<typeof makeResponse>): Response => res as unknown as Response

const makeUserPayload = (overrides: Partial<AccessTokenPayload> = {}): AccessTokenPayload => ({
    sub: 1,
    role: 'admin',
    jti: 'jti-123',
    fingerprint: 'fp',
    iss: 'portfolio-api',
    aud: 'portfolio-admin',
    ...overrides,
})

describe('AuthController', () => {
    let controller: AuthController

    beforeEach(async () => {
        jest.clearAllMocks()
        mockConfigService.get.mockImplementation((key: string) => {
            if (key === 'ADMIN_EMAIL') return 'admin@example.com'
            if (key === 'NODE_ENV') return 'test'
            return undefined
        })

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                { provide: AuthService, useValue: mockAuthService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: jest.fn(() => true) })
            .compile()

        controller = module.get<AuthController>(AuthController)
    })

    describe('POST /auth/login', () => {
        it('calls authService.login with the password, computed fingerprint, and configured admin email', async () => {
            mockAuthService.login.mockResolvedValue({ accessToken: 'access-123', refreshToken: 'refresh-abc' })
            const req = makeRequest()
            const res = makeResponse()

            await controller.login({ password: 'super-secret' }, req, asResponse(res))

            const expectedFingerprint = AuthService.buildFingerprint('Mozilla/5.0', '203.0.113.5')
            expect(mockAuthService.login).toHaveBeenCalledWith('super-secret', expectedFingerprint, 'admin@example.com')
        })

        it('returns only the access token in the response body — refresh token never leaves via JSON', async () => {
            mockAuthService.login.mockResolvedValue({ accessToken: 'access-123', refreshToken: 'refresh-abc' })

            const result = await controller.login(
                { password: 'super-secret' },
                makeRequest(),
                asResponse(makeResponse()),
            )

            expect(result).toEqual({ accessToken: 'access-123' })
        })

        it('sets the refresh token as an httpOnly cookie scoped to /api/auth', async () => {
            mockAuthService.login.mockResolvedValue({ accessToken: 'access-123', refreshToken: 'refresh-abc' })
            const res = makeResponse()

            await controller.login({ password: 'super-secret' }, makeRequest(), asResponse(res))

            expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refresh-abc', {
                httpOnly: true,
                secure: false,
                sameSite: 'strict',
                maxAge: AuthService.getRefreshTokenExpiryMs(),
                path: '/api/auth',
            })
        })

        it('marks the cookie secure in production', async () => {
            mockConfigService.get.mockImplementation((key: string) => {
                if (key === 'ADMIN_EMAIL') return 'admin@example.com'
                if (key === 'NODE_ENV') return 'production'
                return undefined
            })
            mockAuthService.login.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' })
            const res = makeResponse()

            await controller.login({ password: 'super-secret' }, makeRequest(), asResponse(res))

            expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'r', expect.objectContaining({ secure: true }))
        })

        it('propagates UnauthorizedException from AuthService on bad credentials', async () => {
            mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'))

            await expect(
                controller.login({ password: 'wrong-password' }, makeRequest(), asResponse(makeResponse())),
            ).rejects.toThrow(UnauthorizedException)
        })
    })

    describe('POST /auth/refresh', () => {
        it('throws UnauthorizedException when no refresh cookie is present', async () => {
            const req = makeRequest({ cookies: {} })

            await expect(controller.refresh(req, asResponse(makeResponse()))).rejects.toThrow(UnauthorizedException)
        })

        it('does not call authService.refresh when the cookie is missing', async () => {
            await expect(controller.refresh(makeRequest({ cookies: {} }), asResponse(makeResponse()))).rejects.toThrow()
            expect(mockAuthService.refresh).not.toHaveBeenCalled()
        })

        it('calls authService.refresh with the cookie token and computed fingerprint', async () => {
            mockAuthService.refresh.mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' })
            const req = makeRequest({ cookies: { refreshToken: 'old-refresh' } })

            await controller.refresh(req, asResponse(makeResponse()))

            const expectedFingerprint = AuthService.buildFingerprint('Mozilla/5.0', '203.0.113.5')
            expect(mockAuthService.refresh).toHaveBeenCalledWith('old-refresh', expectedFingerprint)
        })

        it('rotates the refresh cookie with the newly issued token', async () => {
            mockAuthService.refresh.mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' })
            const res = makeResponse()

            await controller.refresh(makeRequest({ cookies: { refreshToken: 'old-refresh' } }), asResponse(res))

            expect(res.cookie).toHaveBeenCalledWith(
                'refreshToken',
                'new-refresh',
                expect.objectContaining({ httpOnly: true, path: '/api/auth' }),
            )
        })

        it('returns only the new access token', async () => {
            mockAuthService.refresh.mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' })

            const result = await controller.refresh(
                makeRequest({ cookies: { refreshToken: 'old-refresh' } }),
                asResponse(makeResponse()),
            )

            expect(result).toEqual({ accessToken: 'new-access' })
        })

        it('propagates UnauthorizedException from AuthService for a revoked/expired token', async () => {
            mockAuthService.refresh.mockRejectedValue(new UnauthorizedException('Token revoked'))

            await expect(
                controller.refresh(makeRequest({ cookies: { refreshToken: 'revoked' } }), asResponse(makeResponse())),
            ).rejects.toThrow(UnauthorizedException)
        })
    })

    describe('POST /auth/logout', () => {
        it('is protected by JwtAuthGuard', () => {
            // eslint-disable-next-line @typescript-eslint/unbound-method -- reading Nest's route-guard metadata off the unbound method reference is intentional
            const guards = Reflect.getMetadata(GUARDS_METADATA, AuthController.prototype.logout) as
                | unknown[]
                | undefined

            expect(guards).toContain(JwtAuthGuard)
        })

        it('calls authService.logout with the token jti and refresh cookie', async () => {
            mockAuthService.logout.mockResolvedValue(undefined)
            const req = makeRequest({ cookies: { refreshToken: 'refresh-abc' } }) as AuthenticatedRequest
            req.user = makeUserPayload()

            await controller.logout(req, asResponse(makeResponse()))

            expect(mockAuthService.logout).toHaveBeenCalledWith('jti-123', 'refresh-abc')
        })

        it('clears the refresh cookie scoped to /api/auth', async () => {
            mockAuthService.logout.mockResolvedValue(undefined)
            const req = makeRequest({ cookies: {} }) as AuthenticatedRequest
            req.user = makeUserPayload()
            const res = makeResponse()

            await controller.logout(req, asResponse(res))

            expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/api/auth' })
        })

        it('returns nothing (204 No Content)', async () => {
            mockAuthService.logout.mockResolvedValue(undefined)
            const req = makeRequest({ cookies: {} }) as AuthenticatedRequest
            req.user = makeUserPayload()

            const result = await controller.logout(req, asResponse(makeResponse()))

            expect(result).toBeUndefined()
        })
    })
})
