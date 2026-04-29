import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator'

// =============================================================================
// CreateSocialAccountDto
// =============================================================================
export class CreateSocialAccountDto {
    @ApiProperty({ description: 'Platform name', example: 'GitHub' })
    @IsString()
    @IsNotEmpty()
    name!: string

    @ApiProperty({ description: 'Profile URL', example: 'https://github.com/LamTanPhu' })
    @IsUrl()
    @IsNotEmpty()
    url!: string

    @ApiPropertyOptional({ description: 'Icon image URL', example: 'https://cdn.example.com/github.svg' })
    @IsUrl()
    @IsOptional()
    imageUrl?: string | null

    @ApiPropertyOptional({ description: 'Show publicly on portfolio', example: true, default: true })
    @IsBoolean()
    @IsOptional()
    isPublic?: boolean
}

// =============================================================================
// UpdateSocialAccountDto
// =============================================================================
export class UpdateSocialAccountDto {
    @ApiPropertyOptional({ description: 'Platform name', example: 'LinkedIn' })
    @IsString()
    @IsOptional()
    name?: string

    @ApiPropertyOptional({ description: 'Profile URL', example: 'https://linkedin.com/in/lamtanphu' })
    @IsUrl()
    @IsOptional()
    url?: string

    @ApiPropertyOptional({ description: 'Icon image URL', example: 'https://cdn.example.com/linkedin.svg' })
    @IsUrl()
    @IsOptional()
    imageUrl?: string | null

    @ApiPropertyOptional({ description: 'Public visibility', example: true })
    @IsBoolean()
    @IsOptional()
    isPublic?: boolean
}