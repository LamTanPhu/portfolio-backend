/**
 * @fileoverview SubmitContactCommand
 * 
 * Handles public contact form submission with multiple security layers:
 * - Turnstile bot protection
 * - Input validation & sanitization
 * - Email validation via Value Object
 * - Basic spam content filtering
 * - Raises domain event with metadata for notification & spam analysis
 */

import { Injectable, Inject } from '@nestjs/common'
import type { IContactWriteRepository } from '../../../../domain/repositories/contact/IContactWriteRepository'
import type { ITurnstileVerifier } from '../../../ports/ITurnstileVerifier'
import { ContactSubmittedEvent } from '../../../../domain/events/ContactSubmittedEvent'
import { ValidationError } from '../../../../domain/errors/ValidationError'
import { Email } from '../../../../domain/value-objects/Email'

export interface SubmitContactInput {
  name:          string
  email:         string
  message:       string
  turnstileToken: string
  ipAddress:     string
  browserInfo:   string | null
}

@Injectable()
export class SubmitContactCommand {
  constructor(
    @Inject('IContactWriteRepository')
    private readonly repo: IContactWriteRepository,

    @Inject('ITurnstileVerifier')
    private readonly turnstile: ITurnstileVerifier,
  ) {}

  async execute(input: SubmitContactInput): Promise<ContactSubmittedEvent> {
    // 1. Turnstile verification (anti-bot)
    const isHuman = await this.turnstile.verifyToken(input.turnstileToken)
    if (!isHuman) {
      throw new ValidationError('Turnstile verification failed. Please try again.')
    }

    // 2. Input validation & sanitization
    if (input.name.length > 100) {
      throw new ValidationError('Name is too long (max 100 characters)')
    }
    if (input.message.length > 2000) {
      throw new ValidationError('Message is too long (max 2000 characters)')
    }

    // 3. Email validation via Value Object
    const email = new Email(input.email)

    // 4. Basic spam / suspicious content filtering
    const suspiciousPatterns = /(http|www\.|\.com|\.net|bitcoin|crypto|viagra|porn|casino|loan)/i
    if (suspiciousPatterns.test(input.message)) {
      throw new ValidationError('Message contains suspicious content. Please remove links or promotional text.')
    }

    // 5. Persist to database
    await this.repo.save({
      name:        input.name.trim(),
      email:       email.toString(),
      message:     input.message.trim(),
      ipAddress:   input.ipAddress,
      browserInfo: input.browserInfo,
      createdAt:   new Date(),
    })

    // 6. Raise domain event (with metadata for email & spam analysis)
    return new ContactSubmittedEvent(
      input.name.trim(),
      email.toString(),
      input.message.trim(),
      input.ipAddress,           // ← Added
      input.browserInfo,         // ← Added
    )
  }
}