import { DomainError } from './DomainError'

/**
 * Resource conflict (e.g. duplicate email, slug already exists) — HTTP 409
 */
export class ConflictError extends DomainError {
    constructor(message: string = 'Resource conflict') {
        super(message, 409)
    }
}
