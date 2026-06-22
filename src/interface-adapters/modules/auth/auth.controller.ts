/**
 * @fileoverview AuthController
 * 
 * Handles authentication flows: login, refresh, and logout.
 * Delegates all security logic to AuthService.
 * Uses httpOnly cookies for refresh tokens (secure against XSS).
 */

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request, Response } from 'express'

import { ConfigService } from '@nestjs/config'
import { AuthService } from '../../../application/services/AuthService'
import type { AccessTokenPayload } from '../../../application/services/AuthService'

import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import { LoginDto } from './login.dto'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService:   AuthService,
    private readonly configService: ConfigService,
  ) {}

  // ===========================================================================
  // Login
  // ===========================================================================
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // Strict rate limit
  @ApiOperation({ summary: 'Admin login — returns access token + sets refresh cookie' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many attempts' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const fingerprint = AuthService.buildFingerprint(
      req.headers['user-agent'] ?? '',
      req.ip ?? '',
    )

    // ConfigService is the single source of truth for env vars — consistent with
    // every other part of the app. ConfigValidationService already guarantees this value.
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL') ?? ''

    const { accessToken, refreshToken } = await this.authService.login(
      dto.password,
      fingerprint,
      adminEmail,
    )

    // Secure httpOnly cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      // 'strict': the refresh cookie is scoped to path '/api/auth' (POST only).
      // lax vs strict makes no difference here — lax only relaxes same-site rules
      // for top-level GET navigations, which never hit /api/auth anyway.
      // 'strict' is the more defensive choice with zero practical downside.
      sameSite: 'strict',
      maxAge: AuthService.getRefreshTokenExpiryMs(),
      path: '/api/auth',
    })

    return { accessToken }
  }

  // ===========================================================================
  // Refresh Token
  // ===========================================================================
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Refresh access token using httpOnly refresh cookie' })
  @ApiResponse({ status: 200, description: 'New access token returned' })
  @ApiResponse({ status: 401, description: 'Invalid or missing refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const refreshToken = req.cookies?.refreshToken as string | undefined

    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token')
    }

    const fingerprint = AuthService.buildFingerprint(
      req.headers['user-agent'] ?? '',
      req.ip ?? '',
    )

    const { accessToken, refreshToken: newRefreshToken } = await this.authService.refresh(refreshToken, fingerprint)

    // Rotate the refresh cookie — old token is now revoked in AuthService.
    // Cookie options mirror login exactly so the client sees seamless renewal.
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      // 'strict' — see login cookie comment above for rationale.
      sameSite: 'strict',
      maxAge: AuthService.getRefreshTokenExpiryMs(),
      path: '/api/auth',
    })

    return { accessToken }
  }

  // ===========================================================================
  // Logout
  // ===========================================================================
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Logout — revokes current token and clears refresh cookie' })
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const user = (req as any).user as AccessTokenPayload
    const refreshToken = req.cookies?.refreshToken as string | undefined

    await this.authService.logout(user.jti, refreshToken)

    // Clear refresh token cookie
    res.clearCookie('refreshToken', { path: '/api/auth' })
  }
}