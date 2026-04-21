export abstract class DomainError extends Error {
  public readonly code: string

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    this.code = this.constructor.name
  }
}