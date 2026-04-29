import {
    IsString,
    IsBoolean,
    IsOptional,
    IsNotEmpty,
    IsDateString,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

// =============================================================================
// CreateEducationDto
// startedAt/endedAt accepted as ISO date strings — converted to Date in controller.
// userId extracted from JWT payload in controller — never accepted from client.
// =============================================================================
export class CreateEducationDto {
    @ApiProperty({ description: 'Degree or qualification name', example: 'Bachelor of Software Engineering' })
    @IsString()
    @IsNotEmpty()
    degreeName!: string

    @ApiProperty({ description: 'Institution name', example: 'FPT University' })
    @IsString()
    @IsNotEmpty()
    instituteName!: string

    @ApiPropertyOptional({ description: 'Institution website URL', example: 'https://fpt.edu.vn' })
    @IsString()
    @IsOptional()
    instituteUrl?: string | null

    @ApiProperty({ description: 'Start date — ISO 8601', example: '2022-09-01' })
    @IsDateString()
    startedAt!: string

    @ApiPropertyOptional({ description: 'End date — ISO 8601, null if ongoing', example: '2026-01-01' })
    @IsDateString()
    @IsOptional()
    endedAt?: string | null

    @ApiPropertyOptional({ description: 'Whether degree is completed', example: false, default: false })
    @IsBoolean()
    @IsOptional()
    isCompleted?: boolean
}

// =============================================================================
// UpdateEducationDto
// All fields optional — PATCH semantics, only provided fields updated.
// =============================================================================
export class UpdateEducationDto {
    @ApiPropertyOptional({ description: 'Degree name',        example: 'Bachelor of Software Engineering' })
    @IsString()
    @IsOptional()
    degreeName?: string

    @ApiPropertyOptional({ description: 'Institution name',   example: 'FPT University' })
    @IsString()
    @IsOptional()
    instituteName?: string

    @ApiPropertyOptional({ description: 'Institution URL',    example: 'https://fpt.edu.vn' })
    @IsString()
    @IsOptional()
    instituteUrl?: string | null

    @ApiPropertyOptional({ description: 'Start date ISO 8601', example: '2022-09-01' })
    @IsDateString()
    @IsOptional()
    startedAt?: string

    @ApiPropertyOptional({ description: 'End date ISO 8601',   example: '2026-01-01' })
    @IsDateString()
    @IsOptional()
    endedAt?: string | null

    @ApiPropertyOptional({ description: 'Completed status',   example: true })
    @IsBoolean()
    @IsOptional()
    isCompleted?: boolean
}