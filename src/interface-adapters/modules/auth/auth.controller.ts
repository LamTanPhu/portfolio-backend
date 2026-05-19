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

import { AuthService } from '../../../application/services/AuthService'
import type { AccessTokenPayload } from '../../../application/services/AuthService'

import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import { LoginDto } from './login.dto'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

    const { accessToken, refreshToken } = await this.authService.login(
      dto.password,
      fingerprint,
      1, // Single admin user
    )

    // Secure httpOnly cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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

    const { accessToken } = await this.authService.refresh(refreshToken, fingerprint)

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

    await this.authService.logout(user.jti)

    // Clear refresh token cookie
    res.clearCookie('refreshToken', { path: '/api/auth' })
  }
}