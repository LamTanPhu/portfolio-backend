import { DomainError } from './DomainError'

// =============================================================================
// NotFoundError
// Raised when a requested resource does not exist.
// Mapped to HTTP 404 by DomainExceptionFilter.
// =============================================================================
export class NotFoundError extends DomainError {}