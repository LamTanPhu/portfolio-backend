import { Injectable } from '@nestjs/common'
import type { ILogger } from '../ports/ILogger'
import type { ContactSubmittedEvent } from '../../domain/events/ContactSubmittedEvent'

@Injectable()
export class OnContactSubmitted {
  constructor(private readonly logger: ILogger) {}

  async handle(event: ContactSubmittedEvent): Promise<void> {
    this.logger.log(
      `Contact received from ${event.name} <${event.email}> at ${event.occurredAt.toISOString()}`,
      'OnContactSubmitted',
    )
  }
}