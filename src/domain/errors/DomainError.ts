/**
 * @fileoverview DomainError
 *
 * Abstract base class for all domain/business errors.
 * Keeps domain layer free from HTTP/presentation concerns.
 */

export abstract class DomainError extends Error {
    public readonly code: string
    public readonly statusCode: number

    constructor(message: string, statusCode: number = 500) {
        super(message)
        this.name = this.constructor.name
        this.code = this.constructor.name
        this.statusCode = statusCode

        Object.setPrototypeOf(this, new.target.prototype)
    }
}
