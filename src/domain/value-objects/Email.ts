import { ValidationError } from '../errors/ValidationError'

// =============================================================================
// Email — Value Object
// Immutable, validated email address.
// RFC 5321 format validated on construction — invalid emails never instantiated.
// Normalized to lowercase + trimmed — consistent storage and comparison.
// Used by SubmitContactCommand to validate and normalize contact form emails.
// =============================================================================
export class Email {
  private readonly value: string

  constructor(email: string) {
    if (!Email.isValid(email)) {
      throw new ValidationError(`Invalid email: ${email}`)
    }
    // Normalize — lowercase + trim ensures consistent DB storage
    this.value = email.toLowerCase().trim()
  }

  // RFC 5321 compliant format check
  // local-part @ domain — no whitespace, at least one dot in domain
  static isValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  toString(): string {
    return this.value
  }
}