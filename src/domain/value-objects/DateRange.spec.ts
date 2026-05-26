/**
 * @fileoverview DateRange Value Object Unit Tests
 *
 * Pure unit tests — no NestJS module setup needed.
 * DateRange has no dependencies, instantiated directly.
 */

import { DateRange } from './DateRange'
import { ValidationError } from '../errors/ValidationError'

describe('DateRange', () => {

  // ===========================================================================
  // Construction — valid ranges
  // ===========================================================================
    describe('constructor — valid ranges', () => {
        it('accepts start date before end date', () => {
            const start = new Date('2020-01-01')
            const end   = new Date('2023-01-01')

            expect(() => new DateRange(start, end)).not.toThrow()
        })

        it('accepts null end date (ongoing)', () => {
            const start = new Date('2022-01-01')

            expect(() => new DateRange(start, null)).not.toThrow()
        })

        it('accepts start and end on the same day', () => {
            const date = new Date('2023-06-15')

            expect(() => new DateRange(date, date)).not.toThrow()
        })
    })

  // ===========================================================================
  // Construction — invalid ranges
  // ===========================================================================
    describe('constructor — invalid ranges', () => {
        it('throws ValidationError when end is before start', () => {
            const start = new Date('2023-01-01')
            const end   = new Date('2022-01-01')

            expect(() => new DateRange(start, end)).toThrow(ValidationError)
        })

        it('throws ValidationError with descriptive message', () => {
            const start = new Date('2023-06-01')
            const end   = new Date('2023-01-01')

            expect(() => new DateRange(start, end))
                .toThrow('End date cannot be before start date')
            })
    })

  // ===========================================================================
  // isOngoing getter
  // ===========================================================================
    describe('isOngoing', () => {
        it('returns true when end is null', () => {
            const range = new DateRange(new Date('2022-01-01'), null)

            expect(range.isOngoing).toBe(true)
        })

        it('returns false when end date is set', () => {
            const range = new DateRange(new Date('2022-01-01'), new Date('2023-01-01'))

            expect(range.isOngoing).toBe(false)
        })
    })

  // ===========================================================================
  // durationMs getter
  // ===========================================================================
    describe('durationMs', () => {
        it('returns null when ongoing', () => {
            const range = new DateRange(new Date('2022-01-01'), null)

            expect(range.durationMs).toBeNull()
        })

        it('returns correct duration in milliseconds', () => {
            const start = new Date('2022-01-01')
            const end   = new Date('2023-01-01')
            const range = new DateRange(start, end)

            expect(range.durationMs).toBe(end.getTime() - start.getTime())
        })

        it('returns zero for same start and end date', () => {
            const date  = new Date('2023-01-01')
            const range = new DateRange(date, date)

            expect(range.durationMs).toBe(0)
        })
    })
})