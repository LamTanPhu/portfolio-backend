/**
 * @fileoverview ContactModule
 * 
 * Manages contact form submissions and admin contact message handling.
 * Combines public submission (with anti-spam) and admin CRUD operations.
 */

import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { CacheInfrastructureModule } from '../../../infrastructure/cache/cache.module'

import { ContactController } from './contact.controller'

// Use Cases / Event Handlers
import { SubmitContactCommand } from '../../../application/use-cases/commands/contact/SubmitContactCommand'
import { DeleteContactMessageCommand } from '../../../application/use-cases/commands/contact/DeleteContactMessageCommand'
import { GetContactMessagesQuery } from '../../../application/use-cases/queries/contact/GetContactMessagesQuery'
import { OnContactSubmitted } from '../../../application/event-handlers/OnContactSubmitted'

// Infrastructure
import { PrismaContactRepository } from '../../../infrastructure/database/repositories/contact/PrismaContactRepository'
import { TurnstileVerifier } from '../../../infrastructure/cloudflare/TurnstileVerifier'
import { MailService } from '../../../infrastructure/mail/MailService'
import { NestLogger } from '../../../infrastructure/logging/NestLogger'

@Module({
    imports: [
        AuthModule,
        CacheInfrastructureModule,
    ],

    controllers: [ContactController],

    providers: [
        PrismaContactRepository,
        TurnstileVerifier,
        MailService,
        NestLogger,

        // Ports (Interface Adapters → Infrastructure)
        { provide: 'IContactWriteRepository', useExisting: PrismaContactRepository },
        { provide: 'ITurnstileVerifier', useExisting: TurnstileVerifier },
        { provide: 'IMailService', useExisting: MailService },
        { provide: 'ILogger', useExisting: NestLogger },

        // Use Cases & Event Handlers
        SubmitContactCommand,
        OnContactSubmitted,
        GetContactMessagesQuery,
        DeleteContactMessageCommand,
    ],
})
export class ContactModule {}