import { DomainError } from './DomainError'

/**
 * User is authenticated but not allowed to perform this action (HTTP 403)
 */
export class ForbiddenError extends DomainError {
    constructor(message: string = 'Forbidden') {
        super(message, 403)
    }
}
