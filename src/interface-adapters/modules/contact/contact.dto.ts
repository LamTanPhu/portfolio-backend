import { IsString, IsEmail, IsNotEmpty, Length } from 'class-validator'

export class SubmitContactDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 60)
  name!: string

  @IsEmail()
  email!: string

  @IsString()
  @IsNotEmpty()
  @Length(1, 300)
  message!: string

  @IsString()
  @IsNotEmpty()
  turnstileToken!: string
}