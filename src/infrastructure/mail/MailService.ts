/**
 * @fileoverview MailService
 * 
 * Concrete implementation of IMailService.
 * Handles sending transactional emails with safety measures.
 * 
 * Currently logs to console (development). Ready to be wired with Resend (or any provider)
 * in production.
 */

import { Injectable, Logger } from '@nestjs/common'
import type { IMailService } from '../../application/ports/IMailService'

@Injectable()
export class MailService implements IMailService {
  private readonly logger = new Logger(MailService.name)

  async send(to: string, subject: string, html: string): Promise<void> {
    try {
      // ─── Security Sanitization ─────────────────────────────────────
      const safeTo = this.sanitizeEmailHeader(to)
      const safeSubject = this.sanitizeEmailHeader(subject)

      this.logger.log(`[MailService] Preparing email → ${safeTo} | Subject: ${safeSubject}`)

      // TODO: Production email service (Resend recommended)
      // const resend = new Resend(process.env.RESEND_API_KEY)
      // await resend.emails.send({
      //   from: 'Portfolio <noreply@yourdomain.com>',
      //   to: safeTo,
      //   subject: safeSubject,
      //   html: html,
      // })

      // Development fallback
      this.logger.warn('📧 [DEVELOPMENT] Real email sending is disabled. Email content logged below:')
      this.logger.log('─'.repeat(60))
      this.logger.log(html)
      this.logger.log('─'.repeat(60))
    } catch (error) {
      this.logger.error('Failed to send email', (error as Error).stack)
      throw error // Let the caller (OnContactSubmitted) handle logging
    }
  }

  /**
   * Prevents email header injection attacks (CRLF, etc.)
   */
  private sanitizeEmailHeader(value: string): string {
    return value
      .replace(/[\r\n]/g, ' ')
      .replace(/[\t]/g, ' ')
      .trim()
  }
}