import { DomainError } from './DomainError'

/**
 * Authentication failed or missing credentials (HTTP 401)
 */
export class UnauthorizedError extends DomainError {
    constructor(message: string = 'Unauthorized') {
        super(message, 401)
    }
}