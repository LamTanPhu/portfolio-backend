/**
 * @fileoverview SubmitContactCommand
 *
 * Handles public contact form submission with multiple security layers:
 * - Input validation & sanitization
 * - Email validation via Value Object
 * - Basic spam content filtering
 * - Raises domain event with metadata for notification & spam analysis
 *
 * Note: Turnstile bot protection is enforced upstream by TurnstileGuard
 * (interface adapter layer). This command does NOT re-verify the token —
 * doing so would issue two Cloudflare API calls per submission.
 */

import { Injectable, Inject } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { IContactWriteRepository } from '../../../../domain/repositories/contact/IContactWriteRepository'
import { ContactSubmittedEvent } from '../../../../domain/events/ContactSubmittedEvent'
import { ValidationError } from '../../../../domain/errors/ValidationError'
import { Email } from '../../../../domain/value-objects/Email'

export interface SubmitContactInput {
    name: string
    email: string
    message: string
    ipAddress: string
    browserInfo: string | null
}

// =============================================================================
// Validation Constants
// Must match DB schema constraints (ContactMe model in schema.prisma).
// Changing DB limits requires updating these constants too.
// =============================================================================
const MAX_NAME_LENGTH = 60 // @db.VarChar(60)
const MAX_MESSAGE_LENGTH = 300 // @db.VarChar(300)

@Injectable()
export class SubmitContactCommand {
    constructor(
        @Inject('IContactWriteRepository')
        private readonly repo: IContactWriteRepository,

        // Event bus — decouples command from downstream side effects (email, analytics, etc.)
        private readonly eventEmitter: EventEmitter2,
    ) {}

    async execute(input: SubmitContactInput): Promise<void> {
        // 1. Input validation & sanitization — limits mirror DB schema constraints
        if (input.name.trim().length === 0) {
            throw new ValidationError('Name is required')
        }
        if (input.name.length > MAX_NAME_LENGTH) {
            throw new ValidationError(`Name is too long (max ${MAX_NAME_LENGTH} characters)`)
        }
        if (input.message.trim().length === 0) {
            throw new ValidationError('Message is required')
        }
        if (input.message.length > MAX_MESSAGE_LENGTH) {
            throw new ValidationError(`Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`)
        }

        // 3. Email validation via Value Object
        const email = new Email(input.email)

        // 4. Spam filtering — multi-signal approach.
        //
        // The previous single-regex approach blocked legitimate messages containing
        // ".com", ".net", or common industry words (e.g. "I work at company.com").
        //
        // Strategy: a message is flagged as spam only when MULTIPLE signals fire
        // together. Any one signal alone is not enough to reject.
        const spamSignals: Array<RegExp | ((msg: string) => boolean)> = [
            // Bare URLs (http/https links or www. prefixes)
            /https?:\/\/|www\./i,
            // More than one email address in the message body (one is fine — it's theirs)
            (msg: string) => (msg.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? []).length > 1,
            // Classic unsolicited-commercial-email keywords
            /\b(viagra|casino|porn|bitcoin|crypto\s+invest|make money fast|click here|free money|loan offer)\b/i,
            // Excessive punctuation / shouting (!!!, $$$, etc.)
            /[!$]{3,}/,
        ]

        const signalsFired = spamSignals.filter((signal) =>
            typeof signal === 'function' ? signal(input.message) : signal.test(input.message),
        ).length

        // Two or more signals together = spam. One signal alone lets it through.
        if (signalsFired >= 2) {
            throw new ValidationError('Message contains suspicious content. Please remove links or promotional text.')
        }

        // 5. Persist to database
        await this.repo.save({
            name: input.name.trim(),
            email: email.toString(),
            message: input.message.trim(),
            ipAddress: input.ipAddress,
            browserInfo: input.browserInfo,
            createdAt: new Date(),
        })

        // 6. Emit domain event — OnContactSubmitted handler will send admin notification email.
        //    Fire-and-forget: email failure must not affect the HTTP response.
        this.eventEmitter.emit(
            'contact.submitted',
            new ContactSubmittedEvent(
                input.name.trim(),
                email.toString(),
                input.message.trim(),
                input.ipAddress,
                input.browserInfo,
            ),
        )
    }
}
