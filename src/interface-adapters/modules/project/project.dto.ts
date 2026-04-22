import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

// =============================================================================
// CreateProjectDto
// Validates admin project creation request.
// slug auto-generated from name in CreateProjectCommand — not accepted from client.
// userId extracted from JWT payload in controller — not accepted from client.
// =============================================================================
export class CreateProjectDto {
  @ApiProperty({
    description: 'Project name — slug auto-generated from this value',
    example:     'Electric Motorcycle Rental System',
  })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiProperty({
    description: 'Full project description — supports Markdown',
    example:     'A React Native mobile app for electric motorcycle rentals with real-time GPS tracking.',
  })
  @IsString()
  @IsNotEmpty()
  description!: string

  @ApiProperty({
    description: 'Technology stack used in the project',
    example:     ['React Native', 'TypeScript', 'NestJS', 'PostgreSQL'],
    type:        [String],
  })
  @IsArray()
  techStack!: string[]

  @ApiProperty({
    description: 'Whether the project source code is publicly available',
    example:     true,
  })
  @IsBoolean()
  isOpenSource!: boolean

  @ApiPropertyOptional({
    description: 'Publish project publicly — defaults to draft if omitted',
    example:     false,
    default:     false,
  })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean

  @ApiPropertyOptional({
    description: 'GitHub or source code repository URL',
    example:     'https://github.com/LamTanPhu/portfolio-frontend',
  })
  @IsUrl()
  @IsOptional()
  repoUrl?: string | null

  @ApiPropertyOptional({
    description: 'Live demo or production URL',
    example:     'https://myproject.vercel.app',
  })
  @IsUrl()
  @IsOptional()
  liveUrl?: string | null

  @ApiPropertyOptional({
    description: 'Thumbnail image URL shown on project card',
    example:     'https://cdn.example.com/thumbnails/project.png',
  })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string | null
}

// =============================================================================
// UpdateProjectDto
// All fields optional — PATCH semantics, only provided fields are updated.
// =============================================================================
export class UpdateProjectDto {
  @ApiPropertyOptional({ description: 'Project name',         example: 'Updated Project Name' })
  @IsString()
  @IsOptional()
  name?: string

  @ApiPropertyOptional({ description: 'Project description',  example: 'Updated description.' })
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional({ description: 'Technology stack',     example: ['React', 'Node.js'], type: [String] })
  @IsArray()
  @IsOptional()
  techStack?: string[]

  @ApiPropertyOptional({ description: 'Is open source',       example: true })
  @IsBoolean()
  @IsOptional()
  isOpenSource?: boolean

  @ApiPropertyOptional({ description: 'Published status',     example: true })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean

  @ApiPropertyOptional({ description: 'Repository URL',       example: 'https://github.com/user/repo' })
  @IsUrl()
  @IsOptional()
  repoUrl?: string | null

  @ApiPropertyOptional({ description: 'Live demo URL',        example: 'https://demo.example.com' })
  @IsUrl()
  @IsOptional()
  liveUrl?: string | null

  @ApiPropertyOptional({ description: 'Thumbnail image URL',  example: 'https://cdn.example.com/thumb.png' })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string | null
}