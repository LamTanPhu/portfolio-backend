import { DomainError } from './DomainError';

// =============================================================================
// ValidationError
// Raised when domain invariants or input validation fails.
// Mapped to HTTP 400 by DomainExceptionFilter.
// =============================================================================
export class ValidationError extends DomainError {}