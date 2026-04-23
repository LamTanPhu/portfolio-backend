import { DomainEvent } from './DomainEvent'

// =============================================================================
// ContactSubmittedEvent
// Raised by SubmitContactCommand after contact message is persisted.
// Dispatched to OnContactSubmitted handler — triggers email notification.
// All fields included — handler needs no additional DB lookup.
// =============================================================================
export class ContactSubmittedEvent extends DomainEvent {
  constructor(
    public readonly name:    string,
    public readonly email:   string,
    public readonly message: string,
    occurredAt?: Date,
  ) {
    super(occurredAt)
  }
}