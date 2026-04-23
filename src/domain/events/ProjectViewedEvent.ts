import { DomainEvent } from './DomainEvent'

// =============================================================================
// ProjectViewedEvent
// Raised when a visitor views a project detail page.
// Currently unused in event handlers — wired for future analytics expansion.
// TrackProjectViewCommand handles the increment directly for now.
// =============================================================================
export class ProjectViewedEvent extends DomainEvent {
  constructor(
    public readonly projectId: number,
    occurredAt?: Date,
  ) {
    super(occurredAt)
  }
}