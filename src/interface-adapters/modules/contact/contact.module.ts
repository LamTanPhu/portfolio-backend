import { Module } from '@nestjs/common'
import { ContactController } from './contact.controller'
import { SubmitContactCommand } from '../../../application/use-cases/commands/contact/SubmitContactCommand'
import { PrismaContactRepository } from '../../../infrastructure/database/repositories/PrismaContactRepository'
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service'
import { TurnstileVerifier } from '../../../infrastructure/cloudflare/TurnstileVerifier'
import { MailService } from '../../../infrastructure/mail/MailService'
import { NestLogger } from '../../../infrastructure/logging/NestLogger'

@Module({
    controllers: [ContactController],
    providers: [
        PrismaService,
        PrismaContactRepository,
        TurnstileVerifier,
        MailService,
        NestLogger,
        { provide: 'IContactWriteRepository', useExisting: PrismaContactRepository },
        { provide: 'ITurnstileVerifier', useExisting: TurnstileVerifier },
        { provide: 'IMailService', useExisting: MailService },
        { provide: 'ILogger', useExisting: NestLogger },
        {
            provide: SubmitContactCommand,
            useFactory: (
                repo: PrismaContactRepository,
                turnstile: TurnstileVerifier,
                mail: MailService,
                logger: NestLogger,
            ) => new SubmitContactCommand(repo, turnstile, mail, logger),
            inject: [PrismaContactRepository, TurnstileVerifier, MailService, NestLogger],
        },
    ],
})
export class ContactModule {}