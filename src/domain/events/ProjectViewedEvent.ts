import { DomainEvent } from './DomainEvent'

export class ProjectViewedEvent extends DomainEvent {
  constructor(
    public readonly projectId: number,
    occurredAt?: Date,
  ) {
    super(occurredAt)
  }
}