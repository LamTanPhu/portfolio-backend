import { Injectable, Inject } from '@nestjs/common'
import type { IMailService } from '../ports/IMailService'
import type { ILogger } from '../ports/ILogger'
import type { ContactSubmittedEvent } from '../../domain/events/ContactSubmittedEvent'

// =============================================================================
// OnContactSubmitted
// Handles side effects when a contact message is submitted.
// Single responsibility: react to ContactSubmittedEvent.
// Sends notification email and logs the event.
// Separated from SubmitContactCommand — SRP enforced.
// If email fails, the contact is already saved — no data loss.
// =============================================================================
@Injectable()
export class OnContactSubmitted {
  constructor(
    @Inject('IMailService')
    private readonly mail: IMailService,
    @Inject('ILogger')
    private readonly logger: ILogger,
  ) {}

  async handle(event: ContactSubmittedEvent): Promise<void> {
    // Send admin notification — non-blocking, failure logged but not thrown
    try {
      await this.mail.send(
        process.env.ADMIN_EMAIL ?? 'your@email.com',
        `New message from ${event.name}`,
        `Name: ${event.name}\nEmail: ${event.email}\nMessage: ${event.message}`,
      )
    } catch (error) {
      // Email failure must never cause the contact submission to fail
      // Contact is already persisted — user already got success response
      this.logger.error(
        `Failed to send contact notification email: ${(error as Error).message}`,
        (error as Error).stack,
        'OnContactSubmitted',
      )
    }

    this.logger.log(
      `Contact received from ${event.name} <${event.email}> at ${event.occurredAt.toISOString()}`,
      'OnContactSubmitted',
    )
  }
}