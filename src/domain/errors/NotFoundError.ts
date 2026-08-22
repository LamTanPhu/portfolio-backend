import { DomainError } from './DomainError'

/**
 * Resource not found (HTTP 404)
 */
export class NotFoundError extends DomainError {
    constructor(message: string = 'Resource not found') {
        super(message, 404)
    }
}
