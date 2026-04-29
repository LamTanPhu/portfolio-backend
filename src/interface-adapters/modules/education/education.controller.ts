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
import type { EducationDTO } from '../../../application/dtos/EducationDTO'
import { CreateEducationCommand } from '../../../application/use-cases/commands/education/CreateEducationCommand'
import { DeleteEducationCommand } from '../../../application/use-cases/commands/education/DeleteEducationCommand'
import { UpdateEducationCommand } from '../../../application/use-cases/commands/education/UpdateEducationCommand'
import { GetEducationQuery } from '../../../application/use-cases/queries/skill/education/GetEducationQuery'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import { CreateEducationDto, UpdateEducationDto } from './education.dto'

// =============================================================================
// EducationController
// Public GET — returns all education records, no auth required.
// Admin POST/PATCH/DELETE — JWT required.
// userId extracted from verified JWT payload — never from client input.
// Dates converted from ISO strings to Date objects before reaching commands.
// =============================================================================
@ApiTags('Education')
@Controller('education')
export class EducationController {
    constructor(
        private readonly getQuery:      GetEducationQuery,
        private readonly createCommand: CreateEducationCommand,
        private readonly updateCommand: UpdateEducationCommand,
        private readonly deleteCommand: DeleteEducationCommand,
    ) {}

    // ===========================================================================
    // GET /api/education
    // ===========================================================================
    @Get()
    @ApiOperation({ summary: 'Get all education records' })
    @ApiResponse({ status: 200, description: 'List of education records' })
    async findAll(): Promise<EducationDTO[]> {
        return this.getQuery.execute()
    }

    // ===========================================================================
    // POST /api/education
    // ===========================================================================
    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Create education record — admin only' })
    @ApiResponse({ status: 201, description: 'Education record created' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async create(
        @Body() dto: CreateEducationDto,
        @Req() req: AuthenticatedRequest,
    ): Promise<EducationDTO> {
        return this.createCommand.execute({
        degreeName:    dto.degreeName,
        instituteName: dto.instituteName,
        instituteUrl:  dto.instituteUrl  ?? null,
        startedAt:     new Date(dto.startedAt),
        endedAt:       dto.endedAt ? new Date(dto.endedAt) : null,
        isCompleted:   dto.isCompleted   ?? false,
        userId:        req.user.sub,
        })
    }

    // ===========================================================================
    // PATCH /api/education/:id
    // ===========================================================================
    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Update education record — admin only' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({ status: 200, description: 'Education record updated' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Education record not found' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateEducationDto,
    ): Promise<EducationDTO> {
        return this.updateCommand.execute({
        id,
        degreeName:    dto.degreeName,
        instituteName: dto.instituteName,
        instituteUrl:  dto.instituteUrl,
        startedAt:     dto.startedAt ? new Date(dto.startedAt) : undefined,
        endedAt:       dto.endedAt   ? new Date(dto.endedAt)   : undefined,
        isCompleted:   dto.isCompleted,
        })
    }

    // ===========================================================================
    // DELETE /api/education/:id
    // ===========================================================================
    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete education record — admin only' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({ status: 204, description: 'Education record deleted' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Education record not found' })
    async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
        await this.deleteCommand.execute(id)
    }
}