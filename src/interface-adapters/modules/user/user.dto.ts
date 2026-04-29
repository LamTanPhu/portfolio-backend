import { IsString, IsOptional } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

// =============================================================================
// UpdateUserDto
// Only allows updating firstname, lastname, aboutme.
// email and password intentionally excluded — never updated via API.
// =============================================================================
export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'First name', example: 'Tấn Phú' })
  @IsString()
  @IsOptional()
  firstname?: string

  @ApiPropertyOptional({ description: 'Last name', example: 'Lâm' })
  @IsString()
  @IsOptional()
  lastname?: string

  @ApiPropertyOptional({ description: 'About me bio', example: 'Full-Stack Developer based in HCMC.' })
  @IsString()
  @IsOptional()
  aboutme?: string | null
}