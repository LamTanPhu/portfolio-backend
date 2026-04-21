import {
  IsString,
  IsArray,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  IsUrl,
} from 'class-validator'

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  description!: string

  @IsArray()
  techStack!: string[]

  @IsBoolean()
  isOpenSource!: boolean

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean

  @IsUrl()
  @IsOptional()
  repoUrl?: string | null

  @IsUrl()
  @IsOptional()
  liveUrl?: string | null

  @IsString()
  @IsOptional()
  thumbnailUrl?: string | null
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsArray()
  @IsOptional()
  techStack?: string[]

  @IsBoolean()
  @IsOptional()
  isOpenSource?: boolean

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean

  @IsUrl()
  @IsOptional()
  repoUrl?: string | null

  @IsUrl()
  @IsOptional()
  liveUrl?: string | null

  @IsString()
  @IsOptional()
  thumbnailUrl?: string | null
}