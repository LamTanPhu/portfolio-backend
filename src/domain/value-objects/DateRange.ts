import { ValidationError } from '../errors/ValidationError'

export class DateRange {
  constructor(
    public readonly start: Date,
    public readonly end: Date | null,
  ) {
    if (end && end < start) throw new ValidationError('End date cannot be before start date')
  }

  get isOngoing(): boolean { return this.end === null }
}
