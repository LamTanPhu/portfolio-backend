import { IsString, IsEmail, IsNotEmpty, Length } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

// =============================================================================
// SubmitContactDto
// Validates public contact form submission.
// turnstileToken verified server-side before any data is persisted.
// whitelist: true in ValidationPipe strips any extra fields automatically.
// =============================================================================
export class SubmitContactDto {
  @ApiProperty({
    description: 'Sender full name',
    example:     'John Doe',
    minLength:   1,
    maxLength:   60,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 60)
  name!: string

  @ApiProperty({
    description: 'Sender email address — RFC 5321 compliant',
    example:     'john@example.com',
  })
  @IsEmail()
  email!: string

  @ApiProperty({
    description: 'Message content',
    example:     'Hello, I would like to discuss a project opportunity.',
    minLength:   1,
    maxLength:   300,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 300)
  message!: string

  @ApiProperty({
    description: 'Cloudflare Turnstile verification token — obtained from frontend widget',
    example:     'turnstile-token-from-widget',
  })
  @IsString()
  @IsNotEmpty()
  turnstileToken!: string
}