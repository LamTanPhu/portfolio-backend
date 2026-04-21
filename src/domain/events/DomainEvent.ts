export abstract class DomainEvent {
    public readonly occurredAt: Date

    constructor(occurredAt: Date = new Date()) {
        this.occurredAt = occurredAt
    }
}