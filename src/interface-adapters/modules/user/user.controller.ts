/**
 * @fileoverview UserController
 * 
 * Handles admin user profile operations.
 * All endpoints are protected by JWT authentication.
 */

import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'

import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'

import { GetUserProfileQuery } from '../../../application/use-cases/queries/user/GetUserProfileQuery'
import { UpdateUserProfileCommand } from '../../../application/use-cases/commands/user/UpdateUserProfileCommand'

import { UpdateUserDto } from './user.dto'
import { UserProfileDTO } from '../../../application/dtos/UserProfileDTO'

@ApiTags('User')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class UserController {
  constructor(
    private readonly getProfile: GetUserProfileQuery,
    private readonly updateProfile: UpdateUserProfileCommand,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current admin profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async profile(@Req() req: AuthenticatedRequest): Promise<UserProfileDTO> {
    return this.getProfile.execute(req.user.sub)
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current admin profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Body() dto: UpdateUserDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserProfileDTO> {
    return this.updateProfile.execute(req.user.sub, {
      firstname: dto.firstname,
      lastname:  dto.lastname,
      aboutme:   dto.aboutme,
    })
  }
}