/**
 * @fileoverview ContactModule
 * 
 * Handles contact form submissions and admin contact management.
 */

import { Module } from '@nestjs/common'
import { CacheInfrastructureModule } from '../../../infrastructure/cache/cache.module'
import { AuthModule } from '../auth/auth.module'

import { ContactController } from './contact.controller'

// Use Cases
import { OnContactSubmitted } from '../../../application/event-handlers/OnContactSubmitted'
import { DeleteContactMessageCommand } from '../../../application/use-cases/commands/contact/DeleteContactMessageCommand'
import { SubmitContactCommand } from '../../../application/use-cases/commands/contact/SubmitContactCommand'
import { GetContactMessagesQuery } from '../../../application/use-cases/queries/contact/GetContactMessagesQuery'

// Infrastructure
import { TurnstileVerifier } from '../../../infrastructure/cloudflare/TurnstileVerifier'
import { PrismaContactRepository } from '../../../infrastructure/database/repositories/contact/PrismaContactRepository'
import { NestLogger } from '../../../infrastructure/logging/NestLogger'
import { MailService } from '../../../infrastructure/mail/MailService'

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

        // Ports
        { provide: 'IContactWriteRepository', useExisting: PrismaContactRepository },
        { provide: 'ITurnstileVerifier', useExisting: TurnstileVerifier },
        { provide: 'IMailService', useExisting: MailService },
        { provide: 'ILogger', useExisting: NestLogger },

        // Use Cases
        SubmitContactCommand,
        OnContactSubmitted,
        GetContactMessagesQuery,
        DeleteContactMessageCommand,
    ],
})
export class ContactModule {}