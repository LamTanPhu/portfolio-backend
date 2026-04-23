import { Injectable, Inject } from '@nestjs/common'
import type { IMailService } from '../ports/IMailService'
import type { ILogger } from '../ports/ILogger'
import type { ContactSubmittedEvent } from '../../domain/events/ContactSubmittedEvent'

// =============================================================================
// OnContactSubmitted
// Event handler — reacts to ContactSubmittedEvent raised by SubmitContactCommand.
// Single responsibility: send notification email and log the event.
// Decoupled from command — SRP enforced, email failure never fails the submission.
// Contact is already persisted before this handler runs — zero data loss risk.
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
    // Send admin notification email
    // Wrapped in try/catch — email failure must never propagate to the caller
    // User already received success response before this handler was dispatched
    try {
      await this.mail.send(
        process.env.ADMIN_EMAIL ?? 'your@email.com',
        `New message from ${event.name}`,
        [
          `Name:    ${event.name}`,
          `Email:   ${event.email}`,
          `Message: ${event.message}`,
        ].join('\n'),
      )
    } catch (error) {
      this.logger.error(
        `Failed to send contact notification: ${(error as Error).message}`,
        (error as Error).stack,
        OnContactSubmitted.name,
      )
    }

    this.logger.log(
      `Contact received from ${event.name} <${event.email}> at ${event.occurredAt.toISOString()}`,
      OnContactSubmitted.name,
    )
  }
}