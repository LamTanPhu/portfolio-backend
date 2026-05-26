/**
 * @fileoverview Slug & Email Value Object Unit Tests
 *
 * Pure unit tests — no NestJS module setup needed.
 * Value objects have no dependencies, instantiated directly.
 */

import { Slug } from './Slug'
import { Email } from './Email'
import { ValidationError } from '../errors/ValidationError'

// =============================================================================
// Slug
// =============================================================================

describe('Slug', () => {

  // ===========================================================================
  // Basic slugification
  // ===========================================================================
    describe('from() — basic slugification', () => {
        it('lowercases the input', () => {
            expect(Slug.from('HELLO WORLD').toString()).toBe('hello-world')
        })

        it('replaces spaces with hyphens', () => {
            expect(Slug.from('hello world').toString()).toBe('hello-world')
        })

        it('strips special characters', () => {
            expect(Slug.from('hello! world?').toString()).toBe('hello-world')
        })

        it('collapses multiple spaces into single hyphen', () => {
            expect(Slug.from('hello   world').toString()).toBe('hello-world')
        })

        it('strips leading and trailing hyphens', () => {
            expect(Slug.from('  hello world  ').toString()).toBe('hello-world')
        })

        it('collapses consecutive hyphens', () => {
            expect(Slug.from('hello--world').toString()).toBe('hello-world')
        })

        it('preserves numbers', () => {
            expect(Slug.from('Top 10 Tips').toString()).toBe('top-10-tips')
        })
    })

  // ===========================================================================
  // Unicode / Vietnamese support
  // ===========================================================================
    describe('from() — Unicode handling', () => {
        it('converts Vietnamese accented characters to ASCII', () => {
            expect(Slug.from('Lâm Tấn Phú').toString()).toBe('lam-tan-phu')
        })

        it('handles Vietnamese titles without throwing', () => {
            expect(() => Slug.from('Việt Nam')).not.toThrow()
            expect(Slug.from('Việt Nam').toString()).toBe('viet-nam')
        })

        it('handles mixed Vietnamese and English', () => {
            expect(Slug.from('NestJS và TypeScript').toString()).toBe('nestjs-va-typescript')
        })

        it('handles common accented European characters', () => {
            expect(Slug.from('café résumé').toString()).toBe('cafe-resume')
        })
    })

  // ===========================================================================
  // Error cases
  // ===========================================================================
    describe('from() — error cases', () => {
        it('throws ValidationError for empty string', () => {
            expect(() => Slug.from('')).toThrow(ValidationError)
        })

        it('throws ValidationError for whitespace-only string', () => {
            expect(() => Slug.from('   ')).toThrow(ValidationError)
        })

        it('throws ValidationError for symbols-only string', () => {
            expect(() => Slug.from('!@#$%^&*()')).toThrow(ValidationError)
        })
    })

  // ===========================================================================
  // Named constructor
  // ===========================================================================
    describe('from() vs new Slug()', () => {
        it('produces identical result from both constructors', () => {
            expect(Slug.from('Hello World').toString())
                .toBe(new Slug('Hello World').toString())
        })
    })
})

// =============================================================================
// Email
// =============================================================================

describe('Email', () => {

  // ===========================================================================
  // Valid emails
  // ===========================================================================
    describe('constructor — valid emails', () => {
        const validEmails = [
            'user@example.com',
            'user.name@example.com',
            'user+tag@example.co.uk',
            'user@subdomain.example.com',
            'UPPERCASE@EXAMPLE.COM',   // normalized to lowercase
        ]

        it.each(validEmails)('accepts valid email: %s', (email) => {
            expect(() => new Email(email)).not.toThrow()
        })

        it('normalizes email to lowercase', () => {
            expect(new Email('USER@EXAMPLE.COM').toString()).toBe('user@example.com')
        })

        it('trims whitespace', () => {
            expect(new Email('  user@example.com  ').toString()).toBe('user@example.com')
        })
    })

  // ===========================================================================
  // Invalid emails
  // ===========================================================================
    describe('constructor — invalid emails', () => {
        const invalidEmails = [
            ['missing @',         'userexample.com'      ],
            ['missing domain',    'user@'                ],
            ['missing TLD',       'user@domain'          ],
            ['numeric TLD',       'user@domain.123'      ],
            ['single char TLD',   'user@domain.c'        ],
            ['spaces inside',     'user @example.com'    ],
            ['empty string',      ''                     ],
            ['multiple @',        'user@@example.com'    ],
        ]

        it.each(invalidEmails)('throws ValidationError for %s', (_, email) => {
            expect(() => new Email(email)).toThrow(ValidationError)
        })
    })

  // ===========================================================================
  // Length limits
  // ===========================================================================
    describe('constructor — length limits', () => {
        it('throws ValidationError for email exceeding 254 characters', () => {
            const longLocal = 'a'.repeat(250)
            expect(() => new Email(`${longLocal}@example.com`)).toThrow(ValidationError)
        })

        it('throws ValidationError for local part exceeding 64 characters', () => {
            const longLocal = 'a'.repeat(65)
            expect(() => new Email(`${longLocal}@example.com`)).toThrow(ValidationError)
        })
    })

  // ===========================================================================
  // isValid static method
  // ===========================================================================
    describe('isValid()', () => {
        it('returns true for valid email', () => {
            expect(Email.isValid('user@example.com')).toBe(true)
        })

        it('returns false for invalid email', () => {
            expect(Email.isValid('not-an-email')).toBe(false)
        })

        it('returns false for null-like input', () => {
            expect(Email.isValid('')).toBe(false)
        })
    })
})