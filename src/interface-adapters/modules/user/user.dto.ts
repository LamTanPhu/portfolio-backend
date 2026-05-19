/**
 * @fileoverview User DTOs (Request Models)
 * 
 * DTOs for admin user profile management.
 * Email and password are intentionally excluded from updates.
 */

import { IsString, IsOptional } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'First name', example: 'Tấn Phú' })
  @IsString()
  @IsOptional()
  firstname?: string

  @ApiPropertyOptional({ description: 'Last name', example: 'Lâm' })
  @IsString()
  @IsOptional()
  lastname?: string

  @ApiPropertyOptional({ 
    description: 'About me / bio', 
    example: 'Full-Stack Developer based in Ho Chi Minh City.' 
  })
  @IsString()
  @IsOptional()
  aboutme?: string | null
}