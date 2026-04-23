// =============================================================================
// DomainEvent — Abstract Base
// All domain events extend this class.
// occurredAt defaults to now() — overridable for testing or replay scenarios.
// Events are immutable value objects — no setters, all fields readonly.
// =============================================================================
export abstract class DomainEvent {
    public readonly occurredAt: Date

    constructor(occurredAt: Date = new Date()) {
        this.occurredAt = occurredAt
    }
}