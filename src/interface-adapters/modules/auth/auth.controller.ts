import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AuthService } from '../../../application/services/AuthService'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AccessTokenPayload } from '../../../application/services/AuthService'
import { LoginDto } from './login.dto'

// =============================================================================
// AuthController
// Handles login, logout, token refresh.
// Never touches JWT directly — delegates entirely to AuthService.
// Rate limited independently — login stricter than refresh.
// =============================================================================
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ===========================================================================
  // POST /api/auth/login
  // Issues access token (response body) + refresh token (httpOnly cookie).
  // Rate limited to 5 attempts per minute — brute force prevention.
  // Fingerprint ties token to browser — stolen token from another device rejected.
  // ===========================================================================
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Admin login — returns access token, sets refresh token cookie' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful — access token returned' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many attempts — rate limited' })
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
    )

    // Store refresh token in httpOnly cookie — inaccessible to JavaScript.
    // sameSite: strict prevents CSRF attacks.
    // secure: true in production — HTTPS only.
    // path: /api/auth — cookie only sent to auth endpoints, not every request.
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   AuthService.getRefreshTokenExpiryMs(),
      path:     '/api/auth',
    })

    return { accessToken }
  }

  // ===========================================================================
  // POST /api/auth/refresh
  // Issues new access token using refresh token from httpOnly cookie.
  // Fingerprint re-validated — ensures same browser is refreshing.
  // ===========================================================================
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Refresh access token using httpOnly refresh token cookie' })
  @ApiResponse({ status: 200, description: 'New access token returned' })
  @ApiResponse({ status: 401, description: 'Missing or invalid refresh token' })
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

    const { accessToken } = await this.authService.refresh(
      refreshToken,
      fingerprint,
    )

    return { accessToken }
  }

  // ===========================================================================
  // POST /api/auth/logout
  // Revokes current access token jti — replay attacks blocked immediately.
  // Clears refresh token cookie.
  // Requires valid JWT — prevents unauthenticated logout spam.
  // ===========================================================================
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Logout — revokes current token, clears refresh cookie' })
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