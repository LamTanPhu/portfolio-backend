import { Injectable, Inject } from '@nestjs/common'
import type { IContactWriteRepository } from '../../../../domain/repositories/contact/IContactWriteRepository'
import type { ITurnstileVerifier } from '../../../ports/ITurnstileVerifier'
import type { IMailService } from '../../../ports/IMailService'
import type { ILogger } from '../../../ports/ILogger'
import { ContactSubmittedEvent } from '../../../../domain/events/ContactSubmittedEvent'
import { ValidationError } from '../../../../domain/errors/ValidationError'
import { Email } from '../../../../domain/value-objects/Email'

interface Input {
  name: string
  email: string
  message: string
  turnstileToken: string
  ipAddress: string
  browserInfo: string
}

@Injectable()
export class SubmitContactCommand {
  constructor(
    @Inject('IContactWriteRepository')
    private readonly repo: IContactWriteRepository,
    @Inject('ITurnstileVerifier')
    private readonly turnstile: ITurnstileVerifier,
    @Inject('IMailService')
    private readonly mail: IMailService,
    @Inject('ILogger')
    private readonly logger: ILogger,
  ) {}

  async execute(input: Input): Promise<void> {
    // Verify human via Cloudflare Turnstile before any processing
    const isHuman = await this.turnstile.verifyToken(input.turnstileToken)
    if (!isHuman) throw new ValidationError('Turnstile verification failed')

    // Validate and normalize email via value object
    const email = new Email(input.email)

    await this.repo.save({
      name: input.name,
      email: email.toString(),
      message: input.message,
      ipAddress: input.ipAddress,
      browserInfo: input.browserInfo,
      createdAt: new Date(),
    })

    // Raise domain event — side effects handled here
    const event = new ContactSubmittedEvent(input.name, email.toString(), input.message)

    await this.mail.send(
      'your@email.com',
      `New message from ${event.name}`,
      event.message,
    )

    this.logger.log(
      `Contact submitted by ${event.name} <${event.email}>`,
      'SubmitContactCommand',
    )
  }
}