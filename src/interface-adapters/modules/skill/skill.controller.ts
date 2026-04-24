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
import type { SkillDTO } from '../../../application/dtos/SkillDTO'
import { CreateSkillCommand } from '../../../application/use-cases/commands/skill/CreateSkillCommand'
import { DeleteSkillCommand } from '../../../application/use-cases/commands/skill/DeleteSkillCommand'
import { UpdateSkillCommand } from '../../../application/use-cases/commands/skill/UpdateSkillCommand'
import { GetPublishedSkillsQuery } from '../../../application/use-cases/queries/skill/GetPublishedSkillsQuery'
import type { SkillCategory } from '../../../domain/entities/Skill'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import { CreateSkillDto, UpdateSkillDto } from './skill.dto'

// =============================================================================
// SkillController
// Public GET — returns visible skills, no auth required.
// Admin POST/PATCH/DELETE — JWT required.
// userId extracted from verified JWT payload — never from client input.
// =============================================================================
@ApiTags('Skills')
@Controller('skills')
export class SkillController {
    constructor(
        private readonly getPublishedQuery: GetPublishedSkillsQuery,
        private readonly createCommand:     CreateSkillCommand,
        private readonly updateCommand:     UpdateSkillCommand,
        private readonly deleteCommand:     DeleteSkillCommand,
    ) {}

    @Get()
    @ApiOperation({ summary: 'Get all public skills' })
    @ApiResponse({ status: 200, description: 'List of public skills' })
    async findAll(): Promise<SkillDTO[]> {
        return this.getPublishedQuery.execute()
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Create a skill — admin only' })
    @ApiResponse({ status: 201, description: 'Skill created' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async create(
        @Body() dto: CreateSkillDto,
        @Req() req: AuthenticatedRequest,
    ): Promise<SkillDTO> {
        return this.createCommand.execute({
        name:     dto.name,
        imageUrl: dto.imageUrl ?? null,
        category: dto.category as SkillCategory,
        isPublic: dto.isPublic ?? true,
        userId:   req.user.sub,
        })
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Update a skill — admin only' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({ status: 200, description: 'Skill updated' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Skill not found' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateSkillDto,
    ): Promise<SkillDTO> {
        return this.updateCommand.execute({
        id,
        name:     dto.name,
        imageUrl: dto.imageUrl,
        category: dto.category as SkillCategory | undefined,
        isPublic: dto.isPublic,
        })
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a skill — admin only' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({ status: 204, description: 'Skill deleted' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Skill not found' })
    async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
        await this.deleteCommand.execute(id)
    }
}