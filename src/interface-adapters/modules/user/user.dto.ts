/**
 * @fileoverview User DTOs (Request Models)
 *
 * DTOs for admin user profile management.
 * Email and password are intentionally excluded from updates.
 */

import { IsOptional, IsString, MaxLength } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateUserDto {
    @ApiPropertyOptional({ description: 'First name', example: 'Tấn Phú' })
    @IsString()
    @IsOptional()
    @MaxLength(45) // matches VARCHAR(45) in DB — prevents P2000 surfacing as 500
    firstname?: string

    @ApiPropertyOptional({ description: 'Last name', example: 'Lâm' })
    @IsString()
    @IsOptional()
    @MaxLength(45) // matches VARCHAR(45) in DB
    lastname?: string

    @ApiPropertyOptional({
        description: 'About me / bio',
        example: 'Full-Stack Developer based in Ho Chi Minh City.',
    })
    @IsString()
    @IsOptional()
    @MaxLength(5_000) // TEXT column — reasonable bio ceiling
    aboutme?: string | null
}
