import { ValidationError } from '../errors/ValidationError'

// =============================================================================
// DateRange — Value Object
// Immutable range between two dates.
// Business rule: end date cannot precede start date.
// end null = ongoing (currently enrolled, currently employed etc.)
// Used by Education, Job, Certification aggregates.
// =============================================================================
export class DateRange {
  constructor(
    public readonly start: Date,
    public readonly end:   Date | null,
  ) {
    if (end !== null && end < start) {
      throw new ValidationError('End date cannot be before start date')
    }
  }

  // True when the activity is still ongoing — end date not yet set
  get isOngoing(): boolean {
    return this.end === null
  }

  // Duration in milliseconds — null if ongoing
  get durationMs(): number | null {
    return this.end !== null ? this.end.getTime() - this.start.getTime() : null
  }
}