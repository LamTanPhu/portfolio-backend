/**
 * @fileoverview Job DTOs (Request Models)
 * 
 * These DTOs belong to the Interface Adapter layer.
 * They define the shape of incoming HTTP requests with validation
 * and Swagger documentation.
 */

import { IsString, IsBoolean, IsOptional, IsNotEmpty, IsDateString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateJobDto {
    @ApiProperty({
        description: 'Company name',
        example: 'AmazingTech Solution & Technology Ltd',
    })
    @IsString()
    @IsNotEmpty()
    companyName!: string

    @ApiProperty({
        description: 'Role or job title',
        example: 'Game Developer Intern',
    })
    @IsString()
    @IsNotEmpty()
    role!: string

    @ApiProperty({
        description: 'Start date (ISO 8601)',
        example: '2024-08-01',
    })
    @IsDateString()
    startedAt!: string

    @ApiPropertyOptional({
        description: 'End date (ISO 8601). Null if currently employed',
        example: '2024-12-01',
    })
    @IsDateString()
    @IsOptional()
    endedAt?: string | null

    @ApiPropertyOptional({
        description: 'Whether employment has ended',
        example: false,
        default: false,
    })
    @IsBoolean()
    @IsOptional()
    isEnded?: boolean
}

export class UpdateJobDto {
    @ApiPropertyOptional({
        description: 'Company name',
        example: 'New Company Ltd',
    })
    @IsString()
    @IsOptional()
    companyName?: string

    @ApiPropertyOptional({
        description: 'Role or job title',
        example: 'Senior Developer',
    })
    @IsString()
    @IsOptional()
    role?: string

    @ApiPropertyOptional({
        description: 'Start date (ISO 8601)',
        example: '2024-08-01',
    })
    @IsDateString()
    @IsOptional()
    startedAt?: string

    @ApiPropertyOptional({
        description: 'End date (ISO 8601)',
        example: '2024-12-01',
    })
    @IsDateString()
    @IsOptional()
    endedAt?: string | null

    @ApiPropertyOptional({
        description: 'Whether employment has ended',
        example: true,
    })
    @IsBoolean()
    @IsOptional()
    isEnded?: boolean
}