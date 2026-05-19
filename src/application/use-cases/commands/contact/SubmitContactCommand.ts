/**
 * @fileoverview SubmitContactCommand
 * 
 * Handles public contact form submission.
 * Verifies humanity via Turnstile, validates input, persists message,
 * and raises domain event for further processing (email, logging, etc.).
 */

import { Injectable, Inject } from '@nestjs/common'
import type { IContactWriteRepository } from '../../../../domain/repositories/contact/IContactWriteRepository'
import type { ITurnstileVerifier } from '../../../ports/ITurnstileVerifier'
import { ContactSubmittedEvent } from '../../../../domain/events/ContactSubmittedEvent'
import { ValidationError } from '../../../../domain/errors/ValidationError'
import { Email } from '../../../../domain/value-objects/Email'

export interface SubmitContactInput {
  name: string
  email: string
  message: string
  turnstileToken: string
  ipAddress: string
  browserInfo: string | null
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
    // Step 1: Verify human
    const isHuman = await this.turnstile.verifyToken(input.turnstileToken)
    if (!isHuman) {
      throw new ValidationError('Turnstile verification failed. Please try again.')
    }

    // Step 2: Validate email via value object
    const email = new Email(input.email)

    // Step 3: Persist message
    await this.repo.save({
      name: input.name,
      email: email.toString(),
      message: input.message,
      ipAddress: input.ipAddress,
      browserInfo: input.browserInfo,
      createdAt: new Date(),
    })

    // Step 4: Return domain event (fire-and-forget side effects)
    return new ContactSubmittedEvent(
      input.name,
      email.toString(),
      input.message,
    )
  }
}