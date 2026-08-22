import { ValidationError } from '../errors/ValidationError'

// =============================================================================
// Email — Value Object
// Immutable, validated email address.
// RFC 5321 format validated on construction — invalid emails never instantiated.
// Normalized to lowercase + trimmed — consistent storage and comparison.
// Used by SubmitContactCommand to validate and normalize contact form emails.
//
// Validation rules:
// - local-part: 1–64 chars, no whitespace or @
// - @ separator: exactly one
// - domain: at least one label, dot-separated, no whitespace
// - TLD: 2–63 chars, letters only (rejects .c, .123, etc.)
// - Total length: max 254 chars (RFC 5321 hard limit)
// =============================================================================
export class Email {
    private readonly value: string

    // Max length per RFC 5321
    private static readonly MAX_LENGTH = 254

    constructor(email: string) {
        const normalized = email.toLowerCase().trim()
        if (!Email.isValid(normalized)) {
            throw new ValidationError(`Invalid email: ${email}`)
        }
        this.value = normalized
    }

    // Stricter than bare /^[^\s@]+@[^\s@]+\.[^\s@]+$/:
    // - Enforces TLD is letters-only and at least 2 chars
    // - Enforces total max length
    // - Rejects multiple @ signs
    static isValid(email: string): boolean {
        if (!email || email.length > Email.MAX_LENGTH) return false

        const parts = email.split('@')
        if (parts.length !== 2) return false

        const [local, domain] = parts

        // local-part: 1–64 chars
        if (!local || local.length > 64) return false

        // domain must have at least one dot and a valid TLD
        const domainParts = domain.split('.')
        if (domainParts.length < 2) return false

        const tld = domainParts[domainParts.length - 1]

        // TLD: letters only, 2–63 chars
        if (!/^[a-zA-Z]{2,63}$/.test(tld)) return false

        // Full pattern check
        return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,63}$/.test(email)
    }

    toString(): string {
        return this.value
    }
}
