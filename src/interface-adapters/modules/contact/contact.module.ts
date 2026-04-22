import { Module } from '@nestjs/common'
import { OnContactSubmitted } from '../../../application/event-handlers/OnContactSubmitted'
import { SubmitContactCommand } from '../../../application/use-cases/commands/contact/SubmitContactCommand'
import { TurnstileVerifier } from '../../../infrastructure/cloudflare/TurnstileVerifier'
import { PrismaContactRepository } from '../../../infrastructure/database/repositories/PrismaContactRepository'
import { NestLogger } from '../../../infrastructure/logging/NestLogger'
import { MailService } from '../../../infrastructure/mail/MailService'
import { ContactController } from './contact.controller'

// =============================================================================
// ContactModule
// Wires contact form submission pipeline.
// SubmitContactCommand — validate + persist + raise event
// OnContactSubmitted   — send email + log (side effects only)
// =============================================================================
@Module({
    controllers: [ContactController],
    providers: [
        // ─── Infrastructure implementations ────────────────────────────────────
        PrismaContactRepository,
        TurnstileVerifier,
        MailService,
        NestLogger,

        // ─── Interface tokens ───────────────────────────────────────────────────
        { provide: 'IContactWriteRepository', useExisting: PrismaContactRepository },
        { provide: 'ITurnstileVerifier',      useExisting: TurnstileVerifier },
        { provide: 'IMailService',            useExisting: MailService },
        { provide: 'ILogger',                 useExisting: NestLogger },

        // ─── Command — validate + persist + raise event ─────────────────────────
        {
        provide:    SubmitContactCommand,
        useFactory: (
            repo:      PrismaContactRepository,
            turnstile: TurnstileVerifier,
        ) => new SubmitContactCommand(repo, turnstile),
        inject: [PrismaContactRepository, TurnstileVerifier],
        },

        // ─── Event handler — email + log ────────────────────────────────────────
        {
        provide:    OnContactSubmitted,
        useFactory: (mail: MailService, logger: NestLogger) =>
            new OnContactSubmitted(mail, logger),
        inject: [MailService, NestLogger],
        },
    ],
})
export class ContactModule {}