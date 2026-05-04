import {
    IsString,
    IsBoolean,
    IsOptional,
    IsNotEmpty,
    IsDateString,
    IsUrl,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

// =============================================================================
// CreateCertificationDto
// startDate/endDate accepted as ISO date strings — converted to Date in controller.
// userId extracted from JWT payload in controller — never accepted from client.
// isPublished defaults to false — must be explicitly published.
// =============================================================================
export class CreateCertificationDto {
    @ApiProperty({ description: 'Certification name', example: 'Java Enterprise Edition' })
    @IsString()
    @IsNotEmpty()
    name!: string

    @ApiProperty({ description: 'Certificate or credential URL', example: 'https://coursera.org/verify/abc123' })
    @IsUrl()
    @IsNotEmpty()
    url!: string

    @ApiProperty({ description: 'Issue date — ISO 8601', example: '2024-06-01' })
    @IsDateString()
    startDate!: string

    @ApiPropertyOptional({ description: 'Expiry date — ISO 8601, null if no expiry', example: '2026-06-01' })
    @IsDateString()
    @IsOptional()
    endDate?: string | null

    @ApiPropertyOptional({ description: 'Show publicly on portfolio', example: true, default: false })
    @IsBoolean()
    @IsOptional()
    isPublished?: boolean
}

// =============================================================================
// UpdateCertificationDto
// All fields optional — PATCH semantics, only provided fields updated.
// =============================================================================
export class UpdateCertificationDto {
    @ApiPropertyOptional({ description: 'Certification name', example: 'Java Enterprise Edition' })
    @IsString()
    @IsOptional()
    name?: string

    @ApiPropertyOptional({ description: 'Credential URL', example: 'https://coursera.org/verify/abc123' })
    @IsUrl()
    @IsOptional()
    url?: string

    @ApiPropertyOptional({ description: 'Issue date ISO 8601',  example: '2024-06-01' })
    @IsDateString()
    @IsOptional()
    startDate?: string

    @ApiPropertyOptional({ description: 'Expiry date ISO 8601', example: '2026-06-01' })
    @IsDateString()
    @IsOptional()
    endDate?: string | null

    @ApiPropertyOptional({ description: 'Published status', example: true })
    @IsBoolean()
    @IsOptional()
    isPublished?: boolean
}