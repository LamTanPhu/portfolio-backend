/**
 * @fileoverview Blog DTOs (Request Models)
 * 
 * These DTOs belong to the Interface Adapter layer.
 * They define the shape of incoming HTTP requests with validation
 * and Swagger documentation.
 * 
 * They are intentionally separate from Application DTOs.
 */

import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
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
        description: 'Blog post title — slug will be auto-generated from this',
        example: 'Building a Clean Architecture NestJS API',
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(255)
    title!: string

    @ApiProperty({
        description: 'Full blog content (Markdown supported)',
        example: '## Introduction\nClean Architecture separates concerns...',
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(50_000)
    content!: string

    @ApiPropertyOptional({
        description: 'Short excerpt for list views',
        example: 'A deep dive into Clean Architecture with NestJS.',
    })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    excerpt?: string | null

    @ApiPropertyOptional({
        description: 'Tags for categorization',
        example: ['NestJS', 'Clean Architecture', 'TypeScript'],
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    @MaxLength(45, { each: true })
    @IsOptional()
    tags?: string[]

    @ApiPropertyOptional({
        description: 'Publish immediately? If false, saved as draft.',
        example: false,
        default: false,
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
    @ApiPropertyOptional({ description: 'New title', example: 'Updated Title' })
    @IsString()
    @IsOptional()
    @MinLength(1)
    @MaxLength(255)
    title?: string

    @ApiPropertyOptional({ description: 'New content', example: 'Updated content...' })
    @IsString()
    @IsOptional()
    @MinLength(1)
    @MaxLength(50_000)
    content?: string

    @ApiPropertyOptional({ description: 'New excerpt', example: 'Updated excerpt.' })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    excerpt?: string | null

    @ApiPropertyOptional({
        description: 'New tags (replaces all existing tags)',
        example: ['NestJS', 'TypeScript'],
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    @MaxLength(45, { each: true })
    @IsOptional()
    tags?: string[]

    @ApiPropertyOptional({ description: 'Published status', example: true })
    @IsBoolean()
    @IsOptional()
    isPublished?: boolean
}