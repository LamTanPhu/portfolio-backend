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
import { IsString, IsNotEmpty, MinLength } from 'class-validator'
import { Throttle } from '@nestjs/throttler'
import { AuthService } from '../../../application/services/AuthService'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AccessTokenPayload } from '../../../application/services/AuthService'

// =============================================================================
// LoginDto
// Validates request body — class-validator prevents malformed input.
// whitelist: true in ValidationPipe strips any extra fields automatically.
// =============================================================================
class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string
}

// =============================================================================
// AuthController
// Handles login, logout, token refresh.
// Never touches JWT directly — delegates entirely to AuthService.
// =============================================================================
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ===========================================================================
  // POST /api/auth/login
  // Issues access token (response body) + refresh token (httpOnly cookie).
  // Rate limited to 5 attempts per minute — brute force prevention.
  // ===========================================================================
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: AuthService.getRefreshTokenExpiryMs(),
      path: '/api/auth',  // cookie only sent to auth endpoints
    })

    return { accessToken }
  }

  // ===========================================================================
  // POST /api/auth/refresh
  // Issues new access token using refresh token from httpOnly cookie.
  // ===========================================================================
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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
  // Revokes current access token — replay attacks blocked immediately.
  // Clears refresh token cookie.
  // Requires valid JWT — prevents unauthenticated logout spam.
  // ===========================================================================
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
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