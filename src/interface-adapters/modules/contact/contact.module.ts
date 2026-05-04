import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ContactController } from './contact.controller'
import { SubmitContactCommand } from '../../../application/use-cases/commands/contact/SubmitContactCommand'
import { OnContactSubmitted } from '../../../application/event-handlers/OnContactSubmitted'
import { GetContactMessagesQuery } from '../../../application/use-cases/queries/contact/GetContactMessagesQuery'
import { DeleteContactMessageCommand } from '../../../application/use-cases/commands/contact/DeleteContactMessageCommand'
import { PrismaContactRepository } from '../../../infrastructure/database/repositories/PrismaContactRepository'
import { TurnstileVerifier } from '../../../infrastructure/cloudflare/TurnstileVerifier'
import { MailService } from '../../../infrastructure/mail/MailService'
import { NestLogger } from '../../../infrastructure/logging/NestLogger'

// =============================================================================
// ContactModule
// AuthModule imported — admin GET and DELETE need JwtAuthGuard.
// Public POST uses TurnstileGuard — no JWT needed for form submission.
// PrismaService injected automatically — PrismaModule is @Global().
// =============================================================================
@Module({
    imports: [AuthModule],
    controllers: [ContactController],
    providers: [
        // ─── Infrastructure ─────────────────────────────────────────────────────
        PrismaContactRepository,
        TurnstileVerifier,
        MailService,
        NestLogger,

        // ─── Interface tokens ────────────────────────────────────────────────────
        { provide: 'IContactWriteRepository', useExisting: PrismaContactRepository },
        { provide: 'ITurnstileVerifier',      useExisting: TurnstileVerifier },
        { provide: 'IMailService',            useExisting: MailService },
        { provide: 'ILogger',                 useExisting: NestLogger },

        // ─── Use cases ──────────────────────────────────────────────────────────
        {
        provide:    SubmitContactCommand,
        useFactory: (repo: PrismaContactRepository, turnstile: TurnstileVerifier) =>
            new SubmitContactCommand(repo, turnstile),
        inject: [PrismaContactRepository, TurnstileVerifier],
        },
        {
        provide:    OnContactSubmitted,
        useFactory: (mail: MailService, logger: NestLogger) =>
            new OnContactSubmitted(mail, logger),
        inject: [MailService, NestLogger],
        },
        // PrismaService injected automatically — no useFactory needed
        GetContactMessagesQuery,
        DeleteContactMessageCommand,
    ],
})
export class ContactModule {}