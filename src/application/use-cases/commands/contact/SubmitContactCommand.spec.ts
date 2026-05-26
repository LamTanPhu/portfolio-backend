/**
 * @fileoverview SubmitContactCommand Unit Tests
 *
 * Tests all validation layers in isolation.
 * All external dependencies (repo, turnstile, eventEmitter) are mocked.
 * No database, no network, no Redis.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SubmitContactCommand, SubmitContactInput } from './SubmitContactCommand'
import { ValidationError } from '../../../../domain/errors/ValidationError'

// =============================================================================
// Mocks
// =============================================================================

const mockRepo = {
    save: jest.fn(),
}

const mockTurnstile = {
    verifyToken: jest.fn(),
}

const mockEventEmitter = {
    emit: jest.fn(),
}

// =============================================================================
// Helpers
// =============================================================================

/** Builds a valid input — override specific fields per test */
const makeInput = (overrides: Partial<SubmitContactInput> = {}): SubmitContactInput => ({
    name:           'John Doe',
    email:          'john@example.com',
    message:        'Hello, this is a test message.',
    turnstileToken: 'valid-token',
    ipAddress:      '127.0.0.1',
    browserInfo:    'Mozilla/5.0',
    ...overrides,
})

// =============================================================================
// Suite
// =============================================================================

    describe('SubmitContactCommand', () => {
    let command: SubmitContactCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        // Default: Turnstile passes, repo saves successfully
        mockTurnstile.verifyToken.mockResolvedValue(true)
        mockRepo.save.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
        providers: [
            SubmitContactCommand,
            { provide: 'IContactWriteRepository', useValue: mockRepo        },
            { provide: 'ITurnstileVerifier',       useValue: mockTurnstile   },
            { provide: EventEmitter2,              useValue: mockEventEmitter },
        ],
        }).compile()

        command = module.get<SubmitContactCommand>(SubmitContactCommand)
    })

  // ===========================================================================
  // Happy path
  // ===========================================================================
    describe('execute() — happy path', () => {
        it('saves to DB and emits event on valid input', async () => {
        await command.execute(makeInput())

        expect(mockRepo.save).toHaveBeenCalledTimes(1)
        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
            'contact.submitted',
            expect.objectContaining({ name: 'John Doe' }),
        )
        })

        it('trims whitespace from name and message before saving', async () => {
        await command.execute(makeInput({
            name:    '  John Doe  ',
            message: '  Hello world  ',
        }))

        expect(mockRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({
            name:    'John Doe',
            message: 'Hello world',
            }),
        )
        })

        it('normalizes email to lowercase before saving', async () => {
        await command.execute(makeInput({ email: 'JOHN@EXAMPLE.COM' }))

        expect(mockRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ email: 'john@example.com' }),
        )
        })
    })

  // ===========================================================================
  // Turnstile verification
  // ===========================================================================
    describe('execute() — Turnstile', () => {
        it('throws ValidationError when Turnstile fails', async () => {
        mockTurnstile.verifyToken.mockResolvedValue(false)

        await expect(command.execute(makeInput()))
            .rejects.toThrow(ValidationError)
        })

        it('does not save to DB when Turnstile fails', async () => {
        mockTurnstile.verifyToken.mockResolvedValue(false)

        await expect(command.execute(makeInput())).rejects.toThrow()
        expect(mockRepo.save).not.toHaveBeenCalled()
        })
    })

  // ===========================================================================
  // Name validation
  // ===========================================================================
    describe('execute() — name validation', () => {
        it('throws ValidationError for empty name', async () => {
        await expect(command.execute(makeInput({ name: '   ' })))
            .rejects.toThrow(ValidationError)
        })

        it('throws ValidationError for name exceeding 60 characters', async () => {
        await expect(command.execute(makeInput({ name: 'A'.repeat(61) })))
            .rejects.toThrow(ValidationError)
        })

        it('accepts name at exactly 60 characters', async () => {
        await expect(command.execute(makeInput({ name: 'A'.repeat(60) })))
            .resolves.not.toThrow()
        })
    })

  // ===========================================================================
  // Message validation
  // ===========================================================================
    describe('execute() — message validation', () => {
        it('throws ValidationError for empty message', async () => {
        await expect(command.execute(makeInput({ message: '   ' })))
            .rejects.toThrow(ValidationError)
        })

        it('throws ValidationError for message exceeding 300 characters', async () => {
        await expect(command.execute(makeInput({ message: 'A'.repeat(301) })))
            .rejects.toThrow(ValidationError)
        })

        it('accepts message at exactly 300 characters', async () => {
        await expect(command.execute(makeInput({ message: 'A'.repeat(300) })))
            .resolves.not.toThrow()
        })
    })

  // ===========================================================================
  // Email validation
  // ===========================================================================
    describe('execute() — email validation', () => {
        it('throws ValidationError for invalid email', async () => {
        await expect(command.execute(makeInput({ email: 'not-an-email' })))
            .rejects.toThrow(ValidationError)
        })

        it('throws ValidationError for email missing domain', async () => {
        await expect(command.execute(makeInput({ email: 'user@' })))
            .rejects.toThrow(ValidationError)
        })

        it('throws ValidationError for email missing TLD', async () => {
        await expect(command.execute(makeInput({ email: 'user@domain' })))
            .rejects.toThrow(ValidationError)
        })
    })

  // ===========================================================================
  // Spam filter
  // ===========================================================================
    describe('execute() — spam filter', () => {
        const spamCases = [
            ['http link',    'Check out http://spam.com'],
            ['www link',     'Visit www.spam.com for deals'],
            ['bitcoin',      'Send me bitcoin now'],
            ['crypto',       'Invest in crypto today'],
            ['viagra',       'Buy viagra cheap'],
            ['casino',       'Win at casino'],
            ['loan offer',   'Get a loan today'],
        ]

    it.each(spamCases)('throws ValidationError for %s', async (_, message) => {
        await expect(command.execute(makeInput({ message })))
            .rejects.toThrow(ValidationError)
    })

        it('does not save to DB when spam is detected', async () => {
            await expect(
                command.execute(makeInput({ message: 'Buy bitcoin now' }))
            ).rejects.toThrow()

            expect(mockRepo.save).not.toHaveBeenCalled()
        })
    })

  // ===========================================================================
  // Event emission
  // ===========================================================================
    describe('execute() — event emission', () => {
        it('emits contact.submitted event with correct data', async () => {
        await command.execute(makeInput({
            name:      'Jane Doe',
            email:     'jane@example.com',
            message:   'Hello there',
            ipAddress: '192.168.1.1',
        }))

        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
            'contact.submitted',
            expect.objectContaining({
            name:      'Jane Doe',
            email:     'jane@example.com',
            message:   'Hello there',
            ipAddress: '192.168.1.1',
            }),
        )
        })

        it('does not emit event when validation fails', async () => {
        await expect(
            command.execute(makeInput({ name: '' }))
        ).rejects.toThrow()

        expect(mockEventEmitter.emit).not.toHaveBeenCalled()
        })
    })
})