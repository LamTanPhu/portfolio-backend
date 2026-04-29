import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
    IsBoolean,
    IsDateString,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator'

// =============================================================================
// CreateJobDto
// startedAt/endedAt accepted as ISO date strings — converted to Date in controller.
// userId extracted from JWT payload in controller — never accepted from client.
// isEnded defaults to false — set true when employment ends.
// =============================================================================
export class CreateJobDto {
    @ApiProperty({ description: 'Company name', example: 'AmazingTech Solution & Technology Ltd' })
    @IsString()
    @IsNotEmpty()
    companyName!: string

    @ApiProperty({ description: 'Role or job title', example: 'Game Developer Intern' })
    @IsString()
    @IsNotEmpty()
    role!: string

    @ApiProperty({ description: 'Start date — ISO 8601', example: '2024-08-01' })
    @IsDateString()
    startedAt!: string

    @ApiPropertyOptional({ description: 'End date — ISO 8601, null if currently employed', example: '2024-12-01' })
    @IsDateString()
    @IsOptional()
    endedAt?: string | null

    @ApiPropertyOptional({ description: 'Whether employment has ended', example: false, default: false })
    @IsBoolean()
    @IsOptional()
    isEnded?: boolean
}

// =============================================================================
// UpdateJobDto
// All fields optional — PATCH semantics, only provided fields updated.
// =============================================================================
export class UpdateJobDto {
    @ApiPropertyOptional({ description: 'Company name',  example: 'New Company Ltd' })
    @IsString()
    @IsOptional()
    companyName?: string

    @ApiPropertyOptional({ description: 'Role or title', example: 'Senior Developer' })
    @IsString()
    @IsOptional()
    role?: string

    @ApiPropertyOptional({ description: 'Start date ISO 8601', example: '2024-08-01' })
    @IsDateString()
    @IsOptional()
    startedAt?: string

    @ApiPropertyOptional({ description: 'End date ISO 8601',   example: '2024-12-01' })
    @IsDateString()
    @IsOptional()
    endedAt?: string | null

    @ApiPropertyOptional({ description: 'Employment ended',    example: true })
    @IsBoolean()
    @IsOptional()
    isEnded?: boolean
}