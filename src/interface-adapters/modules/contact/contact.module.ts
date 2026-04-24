import { Module } from '@nestjs/common'
import { ContactController } from './contact.controller'
import { SubmitContactCommand } from '../../../application/use-cases/commands/contact/SubmitContactCommand'
import { OnContactSubmitted } from '../../../application/event-handlers/OnContactSubmitted'
import { PrismaContactRepository } from '../../../infrastructure/database/repositories/PrismaContactRepository'
import { TurnstileVerifier } from '../../../infrastructure/cloudflare/TurnstileVerifier'
import { MailService } from '../../../infrastructure/mail/MailService'
import { NestLogger } from '../../../infrastructure/logging/NestLogger'

// =============================================================================
// ContactModule
// Wires the full contact form submission pipeline.
// SubmitContactCommand — verify Turnstile, persist, raise domain event.
// OnContactSubmitted   — send email notification, log (side effects only).
// No AuthModule import — contact form is public, no JWT needed.
// =============================================================================
@Module({
    controllers: [ContactController],
    providers: [
        // ─── Infrastructure implementations ─────────────────────────────────────
        PrismaContactRepository,
        TurnstileVerifier,
        MailService,
        NestLogger,

        // ─── Interface tokens ────────────────────────────────────────────────────
        { provide: 'IContactWriteRepository', useExisting: PrismaContactRepository },
        { provide: 'ITurnstileVerifier',      useExisting: TurnstileVerifier },
        { provide: 'IMailService',            useExisting: MailService },
        { provide: 'ILogger',                 useExisting: NestLogger },

        // ─── Command — verify + persist + raise event ────────────────────────────
        {
        provide:    SubmitContactCommand,
        useFactory: (
            repo:      PrismaContactRepository,
            turnstile: TurnstileVerifier,
        ) => new SubmitContactCommand(repo, turnstile),
        inject: [PrismaContactRepository, TurnstileVerifier],
        },

        // ─── Event handler — email notification + logging ────────────────────────
        {
        provide:    OnContactSubmitted,
        useFactory: (mail: MailService, logger: NestLogger) =>
            new OnContactSubmitted(mail, logger),
        inject: [MailService, NestLogger],
        },
    ],
})
export class ContactModule {}