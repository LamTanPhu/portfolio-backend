import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    ParseIntPipe,
    Req,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common'
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'
import { GetCertificationsQuery } from '../../../application/use-cases/queries/skill/certificate/GetCertificationsQuery'
import { CreateCertificationCommand } from '../../../application/use-cases/commands/certification/CreateCertificationCommand'
import { UpdateCertificationCommand } from '../../../application/use-cases/commands/certification/UpdateCertificationCommand'
import { DeleteCertificationCommand } from '../../../application/use-cases/commands/certification/DeleteCertificationCommand'
import type { CertificationDTO } from '../../../application/dtos/CertificationDTO'
import { CreateCertificationDto, UpdateCertificationDto } from './certification.dto'

// =============================================================================
// CertificationController
// Public GET — returns published certifications, no auth required.
// Admin POST/PATCH/DELETE — JWT required.
// userId extracted from verified JWT payload — never from client input.
// Dates converted from ISO strings to Date objects before reaching commands.
// =============================================================================
@ApiTags('Certifications')
@Controller('certifications')
export class CertificationController {
    constructor(
        private readonly getQuery:      GetCertificationsQuery,
        private readonly createCommand: CreateCertificationCommand,
        private readonly updateCommand: UpdateCertificationCommand,
        private readonly deleteCommand: DeleteCertificationCommand,
    ) {}

    // ===========================================================================
    // GET /api/certifications
    // ===========================================================================
    @Get()
    @ApiOperation({ summary: 'Get all published certifications' })
    @ApiResponse({ status: 200, description: 'List of published certifications' })
    async findAll(): Promise<CertificationDTO[]> {
        return this.getQuery.execute()
    }

    // ===========================================================================
    // POST /api/certifications
    // ===========================================================================
    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Create certification — admin only' })
    @ApiResponse({ status: 201, description: 'Certification created' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async create(
        @Body() dto: CreateCertificationDto,
        @Req() req: AuthenticatedRequest,
    ): Promise<CertificationDTO> {
        return this.createCommand.execute({
        name:        dto.name,
        url:         dto.url,
        startDate:   new Date(dto.startDate),
        endDate:     dto.endDate ? new Date(dto.endDate) : null,
        isPublished: dto.isPublished ?? false,
        userId:      req.user.sub,
        })
    }

    // ===========================================================================
    // PATCH /api/certifications/:id
    // ===========================================================================
    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Update certification — admin only' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({ status: 200, description: 'Certification updated' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Certification not found' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateCertificationDto,
    ): Promise<CertificationDTO> {
        return this.updateCommand.execute({
        id,
        name:        dto.name,
        url:         dto.url,
        startDate:   dto.startDate ? new Date(dto.startDate) : undefined,
        endDate:     dto.endDate   ? new Date(dto.endDate)   : undefined,
        isPublished: dto.isPublished,
        })
    }

    // ===========================================================================
    // DELETE /api/certifications/:id
    // ===========================================================================
    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete certification — admin only' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({ status: 204, description: 'Certification deleted' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Certification not found' })
    async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
        await this.deleteCommand.execute(id)
    }
}