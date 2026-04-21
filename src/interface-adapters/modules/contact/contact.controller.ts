import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { Throttle } from '@nestjs/throttler'
import { SubmitContactCommand } from '../../../application/use-cases/commands/contact/SubmitContactCommand'
import { TurnstileGuard } from '../../guards/TurnstileGuard'
import { SubmitContactDto } from './contact.dto'

@Controller('contact')
export class ContactController {
  constructor(private readonly submitContact: SubmitContactCommand) {}

  @Post()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UseGuards(TurnstileGuard)
  async handleSubmit(
    @Body() dto: SubmitContactDto,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    await this.submitContact.execute({
      ...dto,
      ipAddress: req.ip ?? '',
      browserInfo: req.headers['user-agent'] ?? '',
    })
    return { success: true }
  }
}