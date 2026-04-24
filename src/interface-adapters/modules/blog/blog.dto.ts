import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

// =============================================================================
// CreateBlogDto
// Validates admin blog post creation request.
// slug auto-generated from title in CreateBlogCommand — never accepted from client.
// publishedAt set server-side when isPublished is true — never accepted from client.
// userId extracted from JWT payload in controller — never accepted from client.
// =============================================================================
export class CreateBlogDto {
    @ApiProperty({
        description: 'Blog post title — slug auto-generated from this value',
        example:     'Building a Clean Architecture NestJS API',
    })
    @IsString()
    @IsNotEmpty()
    title!: string

    @ApiProperty({
        description: 'Full blog post content — supports Markdown',
        example:     '## Introduction\nClean Architecture separates concerns into layers...',
    })
    @IsString()
    @IsNotEmpty()
    content!: string

    @ApiPropertyOptional({
        description: 'Short excerpt shown in blog list view — auto-truncated if omitted',
        example:     'A deep dive into Clean Architecture patterns with NestJS.',
    })
    @IsString()
    @IsOptional()
    excerpt?: string | null

    @ApiPropertyOptional({
        description: 'Tags for categorization and filtering',
        example:     ['NestJS', 'Clean Architecture', 'TypeScript'],
        type:        [String],
    })
    @IsArray()
    @IsOptional()
    tags?: string[]

    @ApiPropertyOptional({
        description: 'Publish immediately — saves as draft if omitted',
        example:     false,
        default:     false,
    })
    @IsBoolean()
    @IsOptional()
    isPublished?: boolean
}

// =============================================================================
// UpdateBlogDto
// All fields optional — PATCH semantics, only provided fields updated.
// Tags replaced in full when provided — partial tag updates not supported.
// =============================================================================
export class UpdateBlogDto {
    @ApiPropertyOptional({ description: 'Blog post title',   example: 'Updated Title' })
    @IsString()
    @IsOptional()
    title?: string

    @ApiPropertyOptional({ description: 'Blog post content', example: 'Updated content...' })
    @IsString()
    @IsOptional()
    content?: string

    @ApiPropertyOptional({ description: 'Short excerpt',     example: 'Updated excerpt.' })
    @IsString()
    @IsOptional()
    excerpt?: string | null

    @ApiPropertyOptional({
        description: 'Tags — replaces all existing tags when provided',
        example:     ['NestJS', 'TypeScript'],
        type:        [String],
    })
    @IsArray()
    @IsOptional()
    tags?: string[]

    @ApiPropertyOptional({ description: 'Published status', example: true })
    @IsBoolean()
    @IsOptional()
    isPublished?: boolean
}