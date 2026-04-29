import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'
import { GetUserProfileQuery } from '../../../application/use-cases/queries/user/GetUserProfileQuery'
import { UpdateUserProfileCommand } from '../../../application/use-cases/commands/user/UpdateUserProfileCommand'
import type { UserProfileDTO } from '../../../application/use-cases/queries/user/GetUserProfileQuery'
import { UpdateUserDto } from './user.dto'

// =============================================================================
// UserController
// All endpoints admin only — JWT required.
// userId always extracted from verified JWT — never from request body.
// =============================================================================
@ApiTags('User')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class UserController {
  constructor(
    private readonly getProfile:    GetUserProfileQuery,
    private readonly updateProfile: UpdateUserProfileCommand,
  ) {}

  // ===========================================================================
  // GET /api/user/profile
  // Returns authenticated admin's profile.
  // ===========================================================================
  @Get('profile')
  @ApiOperation({ summary: 'Get admin profile — admin only' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async profile(@Req() req: AuthenticatedRequest): Promise<UserProfileDTO> {
    return this.getProfile.execute(req.user.sub)
  }

  // ===========================================================================
  // PATCH /api/user/profile
  // Updates authenticated admin's profile.
  // ===========================================================================
  @Patch('profile')
  @ApiOperation({ summary: 'Update admin profile — admin only' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
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