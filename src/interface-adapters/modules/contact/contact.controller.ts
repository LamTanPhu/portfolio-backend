/**
 * @fileoverview ContactController
 * 
 * Handles public contact form submissions and admin contact management.
 * Public POST is protected by Turnstile + rate limiting.
 * Admin endpoints require JWT authentication.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request } from 'express'

import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import { TurnstileGuard } from '../../guards/TurnstileGuard'

import { OnContactSubmitted } from '../../../application/event-handlers/OnContactSubmitted'
import { DeleteContactMessageCommand } from '../../../application/use-cases/commands/contact/DeleteContactMessageCommand'
import { SubmitContactCommand } from '../../../application/use-cases/commands/contact/SubmitContactCommand'
import { GetContactMessagesQuery } from '../../../application/use-cases/queries/contact/GetContactMessagesQuery'

import { ContactMessageDTO } from '../../../application/dtos/contact/ContactMessageDTO'
import { SubmitContactDto } from './contact.dto'

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(
    private readonly submitContact: SubmitContactCommand,
    private readonly onSubmitted: OnContactSubmitted,
    private readonly getMessages: GetContactMessagesQuery,
    private readonly deleteMessage: DeleteContactMessageCommand,
  ) {}

  // ===========================================================================
  // Public Endpoint
  // ===========================================================================
  @Post()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @UseGuards(TurnstileGuard)
  @ApiOperation({ summary: 'Submit contact form message' })
  @ApiResponse({ status: 201, description: 'Message received successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 403, description: 'Turnstile verification failed' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async handleSubmit(
    @Body() dto: SubmitContactDto,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    const event = await this.submitContact.execute({
      name: dto.name,
      email: dto.email,
      message: dto.message,
      turnstileToken: dto.turnstileToken,
      ipAddress: req.ip ?? '',
      browserInfo: req.headers['user-agent'] ?? null,
    })

    // Fire and forget — email sending failure must not affect user experience
    void this.onSubmitted.handle(event)

    return { success: true }
  }

  // ===========================================================================
  // Admin Endpoints
  // ===========================================================================
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get all contact messages — admin only' })
  @ApiResponse({ status: 200, description: 'List of all contact messages' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(): Promise<ContactMessageDTO[]> {
    return this.getMessages.execute()
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a contact message — admin only' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 204, description: 'Message deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.deleteMessage.execute(id)
  }
}