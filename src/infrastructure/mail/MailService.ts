import { Injectable, Logger } from '@nestjs/common'
import { Resend } from 'resend'
import type { IMailService } from '../../application/ports/IMailService'

@Injectable()
export class MailService implements IMailService {
  private readonly logger = new Logger(MailService.name)
  private readonly resend = new Resend(process.env.RESEND_API_KEY)

  async send(to: string, subject: string, html: string): Promise<void> {
    try {
      const safeTo = this.sanitizeEmailHeader(to)
      const safeSubject = this.sanitizeEmailHeader(subject)

      this.logger.log(`[MailService] Preparing email → ${safeTo} | Subject: ${safeSubject}`)

      if (process.env.NODE_ENV !== 'production') {
        // Development fallback — log instead of send
        this.logger.warn('📧 [DEVELOPMENT] Real email sending is disabled. Email content logged below:')
        this.logger.log('─'.repeat(60))
        this.logger.log(html)
        this.logger.log('─'.repeat(60))
        return
      }

      await this.resend.emails.send({
        from: 'Portfolio <onboarding@resend.dev>',
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