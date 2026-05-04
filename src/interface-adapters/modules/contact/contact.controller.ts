import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import type { Request } from 'express'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import { TurnstileGuard } from '../../guards/TurnstileGuard'
import { SubmitContactCommand } from '../../../application/use-cases/commands/contact/SubmitContactCommand'
import { OnContactSubmitted } from '../../../application/event-handlers/OnContactSubmitted'
import { GetContactMessagesQuery } from '../../../application/use-cases/queries/contact/GetContactMessagesQuery'
import { DeleteContactMessageCommand } from '../../../application/use-cases/commands/contact/DeleteContactMessageCommand'
import { SubmitContactDto } from './contact.dto'
import { ContactMessageDTO } from '../../../application/dtos/ContactMessageDTO'

// =============================================================================
// ContactController
// Public POST — contact form submission, Turnstile + rate limit protected.
// Admin GET — list all messages, JWT required.
// Admin DELETE — remove spam messages, JWT required.
// =============================================================================
@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(
    private readonly submitContact:   SubmitContactCommand,
    private readonly onSubmitted:     OnContactSubmitted,
    private readonly getMessages:     GetContactMessagesQuery,
    private readonly deleteMessage:   DeleteContactMessageCommand,
  ) {}

  // ===========================================================================
  // POST /api/contact
  // Public — Turnstile verified, rate limited.
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
    const event = await this.submitContact.execute({
      name:           dto.name,
      email:          dto.email,
      message:        dto.message,
      turnstileToken: dto.turnstileToken,
      ipAddress:      req.ip ?? '',
      browserInfo:    req.headers['user-agent'] ?? null,
    })

    // Fire and forget — email failure must not affect user response
    void this.onSubmitted.handle(event)

    return { success: true }
  }

  // ===========================================================================
  // GET /api/contact — admin only
  // ===========================================================================
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get all contact messages — admin only' })
  @ApiResponse({ status: 200, description: 'List of contact messages' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(): Promise<ContactMessageDTO[]> {
    return this.getMessages.execute()
  }

  // ===========================================================================
  // DELETE /api/contact/:id — admin only
  // ===========================================================================
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a contact message — admin only' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 204, description: 'Message deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.deleteMessage.execute(id)
  }
}