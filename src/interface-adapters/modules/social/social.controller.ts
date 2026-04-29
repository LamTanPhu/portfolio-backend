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
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger'
import type { SocialAccountDTO } from '../../../application/dtos/SocialAccountDTO'
import { CreateSocialAccountCommand } from '../../../application/use-cases/commands/social/CreateSocialAccountCommand'
import { DeleteSocialAccountCommand } from '../../../application/use-cases/commands/social/DeleteSocialAccountCommand'
import { UpdateSocialAccountCommand } from '../../../application/use-cases/commands/social/UpdateSocialAccountCommand'
import { GetPublicSocialAccountsQuery } from '../../../application/use-cases/queries/social/GetPublicSocialAccountsQuery'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import { CreateSocialAccountDto, UpdateSocialAccountDto } from './social.dto'

// =============================================================================
// SocialController
// Public GET — returns visible social accounts, no auth required.
// Admin POST/PATCH/DELETE — JWT required.
// userId extracted from verified JWT payload — never from client input.
// =============================================================================
@ApiTags('Social')
@Controller('social')
export class SocialController {
    constructor(
        private readonly getPublicQuery:   GetPublicSocialAccountsQuery,
        private readonly createCommand:    CreateSocialAccountCommand,
        private readonly updateCommand:    UpdateSocialAccountCommand,
        private readonly deleteCommand:    DeleteSocialAccountCommand,
    ) {}

    @Get()
    @ApiOperation({ summary: 'Get all public social accounts' })
    @ApiResponse({ status: 200, description: 'List of public social accounts' })
    async findAll(): Promise<SocialAccountDTO[]> {
        return this.getPublicQuery.execute()
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Create a social account — admin only' })
    @ApiResponse({ status: 201, description: 'Social account created' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async create(
        @Body() dto: CreateSocialAccountDto,
        @Req() req: AuthenticatedRequest,
    ): Promise<SocialAccountDTO> {
        return this.createCommand.execute({
        name:     dto.name,
        url:      dto.url,
        imageUrl: dto.imageUrl ?? null,
        isPublic: dto.isPublic ?? true,
        userId:   req.user.sub,
        })
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Update a social account — admin only' })
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
        name:     dto.name,
        url:      dto.url,
        imageUrl: dto.imageUrl,
        isPublic: dto.isPublic,
        })
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a social account — admin only' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({ status: 204, description: 'Social account deleted' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Social account not found' })
    async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
        await this.deleteCommand.execute(id)
    }
}