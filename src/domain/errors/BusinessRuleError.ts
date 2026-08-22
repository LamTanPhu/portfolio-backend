import { DomainError } from './DomainError'

/**
 * Business rule violation (e.g. "Cannot publish project without description")
 * Maps to HTTP 400 or 422 depending on context.
 */
export class BusinessRuleError extends DomainError {
    constructor(message: string) {
        super(message, 422) // Unprocessable Entity — very common for business rules
    }
}
