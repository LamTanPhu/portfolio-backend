import { IsString, IsArray, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator'

export class CreateBlogDto {
    @IsString()
    @IsNotEmpty()
    title!: string

    @IsString()
    @IsNotEmpty()
    content!: string

    @IsString()
    @IsOptional()
    excerpt?: string | null

    @IsArray()
    @IsOptional()
    tags?: string[]

    @IsBoolean()
    @IsOptional()
    isPublished?: boolean
    }

    export class UpdateBlogDto {
    @IsString()
    @IsOptional()
    title?: string

    @IsString()
    @IsOptional()
    content?: string

    @IsString()
    @IsOptional()
    excerpt?: string | null

    @IsArray()
    @IsOptional()
    tags?: string[]

    @IsBoolean()
    @IsOptional()
    isPublished?: boolean
}