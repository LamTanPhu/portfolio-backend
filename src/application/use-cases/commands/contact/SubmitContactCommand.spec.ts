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

const mockEventEmitter = {
    emit: jest.fn(),
}

// =============================================================================
// Helpers
// =============================================================================

/** Builds a valid input — override specific fields per test */
const makeInput = (overrides: Partial<SubmitContactInput> = {}): SubmitContactInput => ({
    name: 'John Doe',
    email: 'john@example.com',
    message: 'Hello, this is a test message.',
    ipAddress: '127.0.0.1',
    browserInfo: 'Mozilla/5.0',
    ...overrides,
})

// =============================================================================
// Suite
// =============================================================================

describe('SubmitContactCommand', () => {
    let command: SubmitContactCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        // Default: repo saves successfully
        mockRepo.save.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubmitContactCommand,
                { provide: 'IContactWriteRepository', useValue: mockRepo },
                { provide: EventEmitter2, useValue: mockEventEmitter },
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
            await command.execute(
                makeInput({
                    name: '  John Doe  ',
                    message: '  Hello world  ',
                }),
            )

            expect(mockRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'John Doe',
                    message: 'Hello world',
                }),
            )
        })

        it('normalizes email to lowercase before saving', async () => {
            await command.execute(makeInput({ email: 'JOHN@EXAMPLE.COM' }))

            expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ email: 'john@example.com' }))
        })
    })

    // ===========================================================================
    // Turnstile verification
    //
    // FIX: SubmitContactCommand does NOT verify Turnstile — see the class-level
    // docstring in SubmitContactCommand.ts. That check happens upstream in
    // TurnstileGuard, before this command is ever invoked, so there is nothing
    // for this command's unit tests to exercise here. The old tests mocked an
    // 'ITurnstileVerifier' the constructor doesn't even accept and asserted on
    // a `turnstileToken` field SubmitContactInput doesn't have — both silently
    // no-ops, so `command.execute(makeInput())` always ran the (valid, non-spam)
    // happy path and resolved instead of rejecting. Guard behavior itself is
    // covered by TurnstileGuard.spec.ts.
    // ===========================================================================

    // ===========================================================================
    // Name validation
    // ===========================================================================
    describe('execute() — name validation', () => {
        it('throws ValidationError for empty name', async () => {
            await expect(command.execute(makeInput({ name: '   ' }))).rejects.toThrow(ValidationError)
        })

        it('throws ValidationError for name exceeding 60 characters', async () => {
            await expect(command.execute(makeInput({ name: 'A'.repeat(61) }))).rejects.toThrow(ValidationError)
        })

        it('accepts name at exactly 60 characters', async () => {
            await expect(command.execute(makeInput({ name: 'A'.repeat(60) }))).resolves.not.toThrow()
        })
    })

    // ===========================================================================
    // Message validation
    // ===========================================================================
    describe('execute() — message validation', () => {
        it('throws ValidationError for empty message', async () => {
            await expect(command.execute(makeInput({ message: '   ' }))).rejects.toThrow(ValidationError)
        })

        it('throws ValidationError for message exceeding 300 characters', async () => {
            await expect(command.execute(makeInput({ message: 'A'.repeat(301) }))).rejects.toThrow(ValidationError)
        })

        it('accepts message at exactly 300 characters', async () => {
            await expect(command.execute(makeInput({ message: 'A'.repeat(300) }))).resolves.not.toThrow()
        })
    })

    // ===========================================================================
    // Email validation
    // ===========================================================================
    describe('execute() — email validation', () => {
        it('throws ValidationError for invalid email', async () => {
            await expect(command.execute(makeInput({ email: 'not-an-email' }))).rejects.toThrow(ValidationError)
        })

        it('throws ValidationError for email missing domain', async () => {
            await expect(command.execute(makeInput({ email: 'user@' }))).rejects.toThrow(ValidationError)
        })

        it('throws ValidationError for email missing TLD', async () => {
            await expect(command.execute(makeInput({ email: 'user@domain' }))).rejects.toThrow(ValidationError)
        })
    })

    // ===========================================================================
    // Spam filter
    //
    // FIX: the filter is multi-signal now — a message is only rejected when TWO
    // OR MORE signals fire together (see the comment block in
    // SubmitContactCommand.ts explaining why the old single-regex approach was
    // dropped: it blocked legitimate messages like "I work at company.com").
    // A message containing exactly one signal (a bare URL, OR one spam keyword,
    // OR one burst of "!!!", OR two email addresses) must be let through.
    // ===========================================================================
    describe('execute() — spam filter', () => {
        // A single signal alone must NOT be rejected — this is the exact
        // behavior the two-signal design was introduced to fix.
        const singleSignalCases = [
            ['bare URL only', 'Check out http://myportfolio.dev for my work'],
            ['www link only', 'Visit www.myportfolio.dev to see my projects'],
            ['one keyword only', 'I would love to discuss a possible loan offer'],
            ['punctuation only', 'This is amazing!!!'],
        ]

        it.each(singleSignalCases)('does not throw for %s (single signal)', async (_, message) => {
            await expect(command.execute(makeInput({ message }))).resolves.not.toThrow()
        })

        // Two or more signals together must be rejected.
        const multiSignalCases = [
            ['URL + keyword', 'Check http://spam.com — win at our casino!'],
            ['URL + punctuation', 'Visit www.deals.com now!!!'],
            ['keyword + punctuation', 'Buy viagra now!!!'],
            ['URL + multiple emails', 'Contact http://spam.com, reach us at a@spam.com or b@spam.com'],
            ['keyword + multiple emails', 'Loan offer available — email a@spam.com or b@spam.com'],
        ]

        it.each(multiSignalCases)('throws ValidationError for %s (multiple signals)', async (_, message) => {
            await expect(command.execute(makeInput({ message }))).rejects.toThrow(ValidationError)
        })

        it('does not save to DB when spam is detected', async () => {
            await expect(command.execute(makeInput({ message: 'Buy viagra now!!!' }))).rejects.toThrow()

            expect(mockRepo.save).not.toHaveBeenCalled()
        })
    })

    // ===========================================================================
    // Event emission
    // ===========================================================================
    describe('execute() — event emission', () => {
        it('emits contact.submitted event with correct data', async () => {
            await command.execute(
                makeInput({
                    name: 'Jane Doe',
                    email: 'jane@example.com',
                    message: 'Hello there',
                    ipAddress: '192.168.1.1',
                }),
            )

            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'contact.submitted',
                expect.objectContaining({
                    name: 'Jane Doe',
                    email: 'jane@example.com',
                    message: 'Hello there',
                    ipAddress: '192.168.1.1',
                }),
            )
        })

        it('does not emit event when validation fails', async () => {
            await expect(command.execute(makeInput({ name: '' }))).rejects.toThrow()

            expect(mockEventEmitter.emit).not.toHaveBeenCalled()
        })
    })
})
