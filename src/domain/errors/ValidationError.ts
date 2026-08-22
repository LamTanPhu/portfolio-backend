import { DomainError } from './DomainError'

/**
 * Input validation or business rule violation (HTTP 400)
 */
export class ValidationError extends DomainError {
    constructor(message: string = 'Validation failed') {
        super(message, 400)
    }
}
