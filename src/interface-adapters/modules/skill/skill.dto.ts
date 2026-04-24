import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator'

export enum SkillCategoryEnum {
    frontend = 'frontend',
    backend  = 'backend',
    devops   = 'devops',
    database = 'database',
    other    = 'other',
}

// =============================================================================
// CreateSkillDto
// =============================================================================
export class CreateSkillDto {
    @ApiProperty({ description: 'Skill name', example: 'TypeScript' })
    @IsString()
    @IsNotEmpty()
    name!: string

    @ApiPropertyOptional({ description: 'Icon image URL', example: 'https://cdn.example.com/ts.svg' })
    @IsUrl()
    @IsOptional()
    imageUrl?: string | null

    @ApiProperty({ description: 'Skill category', enum: SkillCategoryEnum, example: 'frontend' })
    @IsEnum(SkillCategoryEnum)
    category!: SkillCategoryEnum

    @ApiPropertyOptional({ description: 'Show publicly on portfolio', example: true, default: true })
    @IsBoolean()
    @IsOptional()
    isPublic?: boolean
}

// =============================================================================
// UpdateSkillDto
// =============================================================================
export class UpdateSkillDto {
    @ApiPropertyOptional({ description: 'Skill name',     example: 'TypeScript' })
    @IsString()
    @IsOptional()
    name?: string

    @ApiPropertyOptional({ description: 'Icon image URL', example: 'https://cdn.example.com/ts.svg' })
    @IsUrl()
    @IsOptional()
    imageUrl?: string | null

    @ApiPropertyOptional({ description: 'Skill category', enum: SkillCategoryEnum })
    @IsEnum(SkillCategoryEnum)
    @IsOptional()
    category?: SkillCategoryEnum

    @ApiPropertyOptional({ description: 'Public visibility', example: true })
    @IsBoolean()
    @IsOptional()
    isPublic?: boolean
}