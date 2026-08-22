import { DomainError } from './DomainError'

/**
 * Rate limiting / throttling violation
 */
export class RateLimitError extends DomainError {
    constructor(message: string = 'Too many requests') {
        super(message, 429)
    }
}
