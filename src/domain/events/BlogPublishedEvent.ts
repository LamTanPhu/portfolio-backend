import { DomainEvent } from './DomainEvent'

// =============================================================================
// BlogPublishedEvent
// Raised when a blog post transitions to published state.
// slug included — downstream handlers can build URLs without extra DB lookup.
// =============================================================================
export class BlogPublishedEvent extends DomainEvent {
  constructor(
    public readonly blogId: number,
    public readonly slug:   string,
    occurredAt?: Date,
  ) {
    super(occurredAt)
  }
}