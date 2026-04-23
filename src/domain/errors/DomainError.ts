// =============================================================================
// DomainError — Abstract Base
// All domain errors extend this class.
// code property used by DomainExceptionFilter for structured HTTP responses.
// name set to concrete class name — enables instanceof checks in filter.
// =============================================================================
export abstract class DomainError extends Error {
  public readonly code: string

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    this.code = this.constructor.name

    // Maintains proper prototype chain in transpiled JavaScript
    Object.setPrototypeOf(this, new.target.prototype)
  }
}