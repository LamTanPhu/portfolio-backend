/**
 * @fileoverview Project DTOs (Request Models)
 */

import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateProjectDto {
  @ApiProperty({
    description: 'Project name — slug will be auto-generated',
    example: 'Electric Motorcycle Rental System',
  })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiProperty({
    description: 'Full project description (supports Markdown)',
    example: 'A React Native mobile app for electric motorcycle rentals...',
  })
  @IsString()
  @IsNotEmpty()
  description!: string

  @ApiProperty({
    description: 'Technology stack',
    example: ['React Native', 'TypeScript', 'NestJS', 'PostgreSQL'],
    type: [String],
  })
  @IsArray()
  techStack!: string[]

  @ApiProperty({ description: 'Is this project open source?', example: true })
  @IsBoolean()
  isOpenSource!: boolean

  @ApiPropertyOptional({ description: 'Publish publicly?', example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean

  @ApiPropertyOptional({ description: 'Repository URL', example: 'https://github.com/user/repo' })
  @IsUrl()
  @IsOptional()
  repoUrl?: string | null

  @ApiPropertyOptional({ description: 'Live demo URL', example: 'https://demo.example.com' })
  @IsUrl()
  @IsOptional()
  liveUrl?: string | null

  @ApiPropertyOptional({ description: 'Thumbnail image URL', example: 'https://cdn.example.com/thumb.png' })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string | null
}

export class UpdateProjectDto {
  @ApiPropertyOptional({ description: 'Project name', example: 'Updated Project Name' })
  @IsString()
  @IsOptional()
  name?: string

  @ApiPropertyOptional({ description: 'Project description', example: 'Updated description.' })
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional({ description: 'Technology stack', example: ['React', 'Node.js'], type: [String] })
  @IsArray()
  @IsOptional()
  techStack?: string[]

  @ApiPropertyOptional({ description: 'Is open source', example: true })
  @IsBoolean()
  @IsOptional()
  isOpenSource?: boolean

  @ApiPropertyOptional({ description: 'Published status', example: true })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean

  @ApiPropertyOptional({ description: 'Repository URL', example: 'https://github.com/user/repo' })
  @IsUrl()
  @IsOptional()
  repoUrl?: string | null

  @ApiPropertyOptional({ description: 'Live demo URL', example: 'https://demo.example.com' })
  @IsUrl()
  @IsOptional()
  liveUrl?: string | null

  @ApiPropertyOptional({ description: 'Thumbnail image URL', example: 'https://cdn.example.com/thumb.png' })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string | null
}