import { Injectable } from '@nestjs/common'
import { IMailService } from '../../application/ports/IMailService'

@Injectable()
export class MailService implements IMailService {
  async send(to: string, subject: string, body: string): Promise<void> {
    // TODO: Wire Resend — https://resend.com/docs/send-with-nodejs
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({
    //   from: 'portfolio@yourdomain.com',
    //   to,
    //   subject,
    //   html: body,
    // })
    console.log(`[Mail] To: ${to} | Subject: ${subject}`)
  }
}