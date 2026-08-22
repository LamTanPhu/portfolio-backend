/**
 * @fileoverview SubmitContactDto
 *
 * Data Transfer Object for public contact form submissions.
 * Used in the Interface Adapter layer (Controller).
 * Contains validation rules and Swagger documentation.
 */

import { IsString, IsEmail, IsNotEmpty, Length } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class SubmitContactDto {
    @ApiProperty({
        description: 'Sender full name',
        example: 'John Doe',
        minLength: 1,
        maxLength: 60,
    })
    @IsString()
    @IsNotEmpty()
    @Length(1, 60)
    name!: string

    @ApiProperty({
        description: 'Valid email address (RFC 5321 compliant)',
        example: 'john@example.com',
    })
    @IsEmail()
    @IsNotEmpty()
    email!: string

    @ApiProperty({
        description: 'Message content from the user',
        example: 'Hello, I would like to discuss a potential collaboration.',
        minLength: 10,
        maxLength: 300,
    })
    @IsString()
    @IsNotEmpty()
    @Length(10, 300)
    message!: string

    @ApiProperty({
        description: 'Cloudflare Turnstile verification token from frontend',
        example: '0x4AAAAAAA...',
    })
    @IsString()
    @IsNotEmpty()
    turnstileToken!: string
}
