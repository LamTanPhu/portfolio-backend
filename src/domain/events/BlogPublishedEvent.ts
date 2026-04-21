import { DomainEvent } from './DomainEvent'

export class BlogPublishedEvent extends DomainEvent {
  constructor(
    public readonly blogId: number,
    public readonly slug: string,
    occurredAt?: Date,
  ) {
    super(occurredAt)
  }
}