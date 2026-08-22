/**
 * @fileoverview ContactSubmittedEvent
 *
 * Domain event raised after a contact message is successfully saved.
 * Contains metadata useful for spam analysis and admin notification.
 */

import { DomainEvent } from './DomainEvent'

export class ContactSubmittedEvent extends DomainEvent {
    constructor(
        public readonly name: string,
        public readonly email: string,
        public readonly message: string,
        public readonly ipAddress: string | null,
        public readonly browserInfo: string | null,
        occurredAt?: Date,
    ) {
        super(occurredAt)
    }
}
