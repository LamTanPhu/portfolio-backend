import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { SubmitContactCommand } from '../../../application/use-cases/commands/contact/SubmitContactCommand'
import { OnContactSubmitted } from '../../../application/event-handlers/OnContactSubmitted'
import { TurnstileGuard } from '../../guards/TurnstileGuard'
import { SubmitContactDto } from './contact.dto'

// =============================================================================
// ContactController
// Handles contact form submissions.
// Rate limited — 3 submissions per minute per IP.
// TurnstileGuard verifies human before command executes.
// Controller dispatches domain event to handler after command succeeds.
// =============================================================================
@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(
    private readonly submitContact: SubmitContactCommand,
    private readonly onContactSubmitted: OnContactSubmitted,
  ) {}

  // ===========================================================================
  // POST /api/contact
  // Validates, persists, raises event, dispatches to handler.
  // TurnstileGuard runs before this method — bot requests never reach here.
  // ===========================================================================
  @Post()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @UseGuards(TurnstileGuard)
  @ApiOperation({ summary: 'Submit contact form message' })
  @ApiResponse({ status: 201, description: 'Message received' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 403, description: 'Turnstile verification failed' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async handleSubmit(
    @Body() dto: SubmitContactDto,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    // Execute command — returns domain event on success
    const event = await this.submitContact.execute({
      name:           dto.name,
      email:          dto.email,
      message:        dto.message,
      turnstileToken: dto.turnstileToken,
      ipAddress:      req.ip ?? '',
      browserInfo:    req.headers['user-agent'] ?? null,
    })

    // Dispatch event to handler — fire and forget
    // Email notification failure must not affect user response
    void this.onContactSubmitted.handle(event)

    return { success: true }
  }
}