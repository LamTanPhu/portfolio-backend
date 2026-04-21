import { DomainEvent } from './DomainEvent'

export class ContactSubmittedEvent extends DomainEvent {
  constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly message: string,
    occurredAt?: Date,
  ) {
    super(occurredAt)
  }
}