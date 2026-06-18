import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'
import type { IMailService } from '../../application/ports/IMailService'

@Injectable()
export class MailService implements IMailService {
  private readonly logger  = new Logger(MailService.name)
  private readonly resend:  Resend

  // ConfigService injected so we read env vars consistently across the app.
  // Resend client instantiated in constructor (not as a field initializer) so
  // ConfigService is available — field initializers run before DI completes.
  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'))
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    try {
      const safeTo = this.sanitizeEmailHeader(to)
      const safeSubject = this.sanitizeEmailHeader(subject)

      this.logger.log(`[MailService] Preparing email → ${safeTo} | Subject: ${safeSubject}`)

      if (this.configService.get<string>('NODE_ENV') !== 'production') {
        // Development fallback — log instead of send
        this.logger.warn('[DEVELOPMENT] Real email sending is disabled. Email content logged below:')
        this.logger.log('─'.repeat(60))
        this.logger.log(html)
        this.logger.log('─'.repeat(60))
        return
      }

      // RESEND_FROM_ADDRESS must be a verified domain in production.
      // 'onboarding@resend.dev' only works for Resend sandbox — never in prod.
      // Example value: 'Portfolio <hello@yourdomain.com>'
      const fromAddress = this.configService.get<string>('RESEND_FROM_ADDRESS') ?? 'Portfolio <onboarding@resend.dev>'

      await this.resend.emails.send({
        from: fromAddress,
        to: safeTo,
        subject: safeSubject,
        html,
      })

      this.logger.log(`Email sent successfully → ${safeTo}`)
    } catch (error) {
      this.logger.error('Failed to send email', (error as Error).stack)
      throw error
    }
  }

  private sanitizeEmailHeader(value: string): string {
    return value
      .replace(/[\r\n]/g, ' ')
      .replace(/[\t]/g, ' ')
      .trim()
  }
}