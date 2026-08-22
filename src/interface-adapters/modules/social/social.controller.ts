/**
 * @fileoverview SocialController
 *
 * Handles social account links for the public portfolio and admin management.
 */

import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'

import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'

import { CreateSocialAccountCommand } from '../../../application/use-cases/commands/social/CreateSocialAccountCommand'
import { DeleteSocialAccountCommand } from '../../../application/use-cases/commands/social/DeleteSocialAccountCommand'
import { UpdateSocialAccountCommand } from '../../../application/use-cases/commands/social/UpdateSocialAccountCommand'
import { GetPublicSocialAccountsQuery } from '../../../application/use-cases/queries/social/GetPublicSocialAccountsQuery'

import type { SocialAccountDTO } from '../../../application/dtos/SocialAccountDTO'
import { CreateSocialAccountDto, UpdateSocialAccountDto } from './social.dto'

@ApiTags('Social')
@Controller('social')
export class SocialController {
    constructor(
        private readonly getPublicQuery: GetPublicSocialAccountsQuery,
        private readonly createCommand: CreateSocialAccountCommand,
        private readonly updateCommand: UpdateSocialAccountCommand,
        private readonly deleteCommand: DeleteSocialAccountCommand,
    ) {}

    @Get()
    @Throttle({ default: { limit: 120, ttl: 60_000 } })
    @ApiOperation({ summary: 'Get all public social accounts (Public)' })
    @ApiResponse({ status: 200, description: 'List of public social accounts' })
    async findAll(): Promise<SocialAccountDTO[]> {
        return this.getPublicQuery.execute()
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Create social account — admin only' })
    @ApiResponse({ status: 201, description: 'Social account created' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async create(@Body() dto: CreateSocialAccountDto, @Req() req: AuthenticatedRequest): Promise<SocialAccountDTO> {
        return this.createCommand.execute({
            name: dto.name,
            url: dto.url,
            imageUrl: dto.imageUrl ?? null,
            isPublic: dto.isPublic ?? true,
            userId: req.user.sub,
        })
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Update social account — admin only' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({ status: 200, description: 'Social account updated' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Social account not found' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateSocialAccountDto,
    ): Promise<SocialAccountDTO> {
        return this.updateCommand.execute({
            id,
            name: dto.name,
            url: dto.url,
            imageUrl: dto.imageUrl,
            isPublic: dto.isPublic,
        })
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete social account — admin only' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({ status: 204, description: 'Social account deleted' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Social account not found' })
    async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
        await this.deleteCommand.execute(id)
    }
}
