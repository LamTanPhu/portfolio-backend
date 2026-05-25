/**
 * @fileoverview ContactController
 * 
 * Handles public contact form submissions and admin contact management.
 * Public endpoint is heavily protected against spam and bots.
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

import { SubmitContactCommand } from '../../../application/use-cases/commands/contact/SubmitContactCommand'
import { GetContactMessagesQuery } from '../../../application/use-cases/queries/contact/GetContactMessagesQuery'
import { DeleteContactMessageCommand } from '../../../application/use-cases/commands/contact/DeleteContactMessageCommand'

import type { ContactMessageDTO } from '../../../application/dtos/contact/ContactMessageDTO'
import { SubmitContactDto } from './contact.dto'

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(
    private readonly submitContact: SubmitContactCommand,
    private readonly getMessages: GetContactMessagesQuery,
    private readonly deleteMessage: DeleteContactMessageCommand,
  ) {}

  // ===========================================================================
  // PUBLIC ENDPOINT — Anti-Spam Protected
  // ===========================================================================
  @Post()
  @Throttle({ default: { limit: 3, ttl: 60_000 } }) // 3 messages per minute per IP
  @UseGuards(TurnstileGuard)
  @ApiOperation({ summary: 'Submit a contact form message (public)' })
  @ApiResponse({ status: 201, description: 'Message received successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Turnstile verification failed' })
  @ApiResponse({ status: 429, description: 'Too many requests — try again later' })
  async handleSubmit(
    @Body() dto: SubmitContactDto,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    await this.submitContact.execute({
      name: dto.name,
      email: dto.email,
      message: dto.message,
      turnstileToken: dto.turnstileToken,
      ipAddress: req.ip ?? 'unknown',
      browserInfo: req.headers['user-agent'] ?? null,
    })

    return {
      success: true,
      message: 'Thank you! Your message has been received.',
    }
  }

  // ===========================================================================
  // ADMIN ENDPOINTS
  // ===========================================================================
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get all contact messages — admin only' })
  @ApiResponse({ status: 200, description: 'List of contact messages' })
  async findAll(): Promise<ContactMessageDTO[]> {
    return this.getMessages.execute()
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a contact message — admin only' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 204, description: 'Message deleted' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.deleteMessage.execute(id)
  }
}