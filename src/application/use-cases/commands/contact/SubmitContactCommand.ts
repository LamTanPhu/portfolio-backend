import { Injectable, Inject } from '@nestjs/common'
import type { IContactWriteRepository } from '../../../../domain/repositories/contact/IContactWriteRepository'
import type { ITurnstileVerifier } from '../../../ports/ITurnstileVerifier'
import { ContactSubmittedEvent } from '../../../../domain/events/ContactSubmittedEvent'
import { ValidationError } from '../../../../domain/errors/ValidationError'
import { Email } from '../../../../domain/value-objects/Email'

// =============================================================================
// SubmitContactCommand Input
// =============================================================================
export interface SubmitContactInput {
  name:          string
  email:         string
  message:       string
  turnstileToken: string
  ipAddress:     string
  browserInfo:   string | null
}

// =============================================================================
// SubmitContactCommand
// Single responsibility: validate, persist, raise domain event.
// Does NOT send email or log — those are side effects handled by event handlers.
// Mail and logging are infrastructure concerns — commands stay pure.
// =============================================================================
@Injectable()
export class SubmitContactCommand {
  constructor(
    @Inject('IContactWriteRepository')
    private readonly repo: IContactWriteRepository,
    @Inject('ITurnstileVerifier')
    private readonly turnstile: ITurnstileVerifier,
  ) {}

  async execute(input: SubmitContactInput): Promise<ContactSubmittedEvent> {
    // Step 1 — Verify human via Cloudflare Turnstile before any DB write
    const isHuman = await this.turnstile.verifyToken(input.turnstileToken)
    if (!isHuman) throw new ValidationError('Turnstile verification failed')

    // Step 2 — Validate and normalize email via value object
    // Throws ValidationError if format is invalid — caught by DomainExceptionFilter
    const email = new Email(input.email)

    // Step 3 — Persist contact message
    await this.repo.save({
      name:        input.name,
      email:       email.toString(),
      message:     input.message,
      ipAddress:   input.ipAddress,
      browserInfo: input.browserInfo,
      createdAt:   new Date(),
    })

    // Step 4 — Raise domain event and return it
    // Caller (controller) dispatches to event handlers — command never sends email
    return new ContactSubmittedEvent(
      input.name,
      email.toString(),
      input.message,
    )
  }
}