/**
 * @fileoverview VerifySnakeCaptchaDto
 *
 * Data Transfer Object for POST /captcha/snake/verify.
 * Used in the Interface Adapter layer (Controller).
 */

import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class VerifySnakeCaptchaDto {
    @ApiProperty({
        description: 'Challenge ID previously issued by POST /captcha/snake/challenge',
        example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    })
    @IsString()
    @IsNotEmpty()
    challengeId!: string

    @ApiProperty({
        description: 'Food items eaten during the playthrough (must equal the win condition)',
        example: 10,
    })
    @IsInt()
    @Min(0)
    eaten!: number

    @ApiProperty({
        description: 'Milliseconds elapsed from game start to the win condition',
        example: 18400,
    })
    @IsInt()
    @Min(0)
    durationMs!: number

    @ApiProperty({
        description: 'Number of direction-change inputs made during the playthrough',
        example: 27,
    })
    @IsInt()
    @Min(0)
    moveCount!: number
}
