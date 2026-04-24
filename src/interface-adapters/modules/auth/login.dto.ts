import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, MinLength } from 'class-validator'

// =============================================================================
// LoginDto
// Validates admin login request body.
// whitelist: true in ValidationPipe strips any extra fields automatically.
// Separated into own file — Single Responsibility, one class per file.
// =============================================================================
export class LoginDto {
    @ApiProperty({
        description: 'Admin password — minimum 10 characters',
        example:     'your-secure-password',
        minLength:   10,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    password!: string
}