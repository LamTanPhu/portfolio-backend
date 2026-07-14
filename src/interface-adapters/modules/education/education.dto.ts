/**
 * @fileoverview Education DTOs (Request Models)
 * 
 * These DTOs belong to the Interface Adapter layer.
 * They define the shape of incoming HTTP requests with validation
 * and Swagger documentation.
 */

import { IsString, IsBoolean, IsOptional, IsNotEmpty, IsDateString, IsUrl, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateEducationDto {
    @ApiProperty({
        description: 'Degree or qualification name',
        example: 'Bachelor of Software Engineering',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255) // matches Education.degreeName @db.VarChar(255) — prevents P2000 surfacing as 500
    degreeName!: string

    @ApiProperty({
        description: 'Institution name',
        example: 'FPT University',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255) // matches Education.instituteName @db.VarChar(255) — prevents P2000 surfacing as 500
    instituteName!: string

    @ApiPropertyOptional({
        description: 'Institution website URL',
        example: 'https://fpt.edu.vn',
    })
    @IsUrl()
    @IsOptional()
    instituteUrl?: string | null

    @ApiProperty({
        description: 'Start date (ISO 8601)',
        example: '2022-09-01',
    })
    @IsDateString()
    startedAt!: string

    @ApiPropertyOptional({
        description: 'End date (ISO 8601). Null if currently ongoing',
        example: '2026-06-01',
    })
    @IsDateString()
    @IsOptional()
    endedAt?: string | null

    @ApiPropertyOptional({
        description: 'Whether the degree has been completed',
        example: false,
        default: false,
    })
    @IsBoolean()
    @IsOptional()
    isCompleted?: boolean
}

export class UpdateEducationDto {
    @ApiPropertyOptional({
        description: 'Degree or qualification name',
        example: 'Bachelor of Software Engineering',
    })
    @IsString()
    @IsOptional()
    @MaxLength(255) // matches Education.degreeName @db.VarChar(255) — prevents P2000 surfacing as 500
    degreeName?: string

    @ApiPropertyOptional({
        description: 'Institution name',
        example: 'FPT University',
    })
    @IsString()
    @IsOptional()
    @MaxLength(255) // matches Education.instituteName @db.VarChar(255) — prevents P2000 surfacing as 500
    instituteName?: string

    @ApiPropertyOptional({
        description: 'Institution website URL',
        example: 'https://fpt.edu.vn',
    })
    @IsUrl()
    @IsOptional()
    instituteUrl?: string | null

    @ApiPropertyOptional({
        description: 'Start date (ISO 8601)',
        example: '2022-09-01',
    })
    @IsDateString()
    @IsOptional()
    startedAt?: string

    @ApiPropertyOptional({
        description: 'End date (ISO 8601)',
        example: '2026-06-01',
    })
    @IsDateString()
    @IsOptional()
    endedAt?: string | null

    @ApiPropertyOptional({
        description: 'Whether the degree has been completed',
        example: true,
    })
    @IsBoolean()
    @IsOptional()
    isCompleted?: boolean
}