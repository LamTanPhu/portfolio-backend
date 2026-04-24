import { Injectable, Logger } from '@nestjs/common'
import type { IMailService } from '../../application/ports/IMailService'

// =============================================================================
// MailService
// Implements IMailService — handles transactional email delivery.
// Currently logs to console — wire Resend before production deploy.
// Application layer depends on IMailService interface — never on MailService directly.
//
// To wire Resend:
//   npm install resend
//   const resend = new Resend(process.env.RESEND_API_KEY)
//   await resend.emails.send({ from: 'portfolio@yourdomain.com', to, subject, html: body })
// =============================================================================
@Injectable()
export class MailService implements IMailService {
  private readonly logger = new Logger(MailService.name)

  async send(to: string, subject: string, body: string): Promise<void> {
    // TODO: Replace with Resend before production deploy
    // Resend docs: https://resend.com/docs/send-with-nodejs
    this.logger.log(`[Mail] To: ${to} | Subject: ${subject}`)
  }
}