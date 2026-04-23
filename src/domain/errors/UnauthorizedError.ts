import { DomainError } from './DomainError';

// =============================================================================
// UnauthorizedError
// Raised when authentication fails or token is invalid.
// Mapped to HTTP 401 by DomainExceptionFilter.
// =============================================================================
export class UnauthorizedError extends DomainError {}