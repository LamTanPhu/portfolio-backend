import { DomainError } from './DomainError'

/**
 * Unexpected internal error — should be used sparingly.
 * Maps to HTTP 500.
 */
export class InternalServerError extends DomainError {
    constructor(message: string = 'Internal server error') {
        super(message, 500)
    }
}