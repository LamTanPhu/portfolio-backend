/**
 * @fileoverview OnContactSubmitted
 * 
 * Event handler for ContactSubmittedEvent.
 * Sends admin notification email with useful context for spam review.
 */

import { Injectable, Inject } from '@nestjs/common'
import type { IMailService } from '../ports/IMailService'
import type { ILogger } from '../ports/ILogger'
import type { ContactSubmittedEvent } from '../../domain/events/ContactSubmittedEvent'

@Injectable()
export class OnContactSubmitted {
  constructor(
    @Inject('IMailService')
    private readonly mail: IMailService,

    @Inject('ILogger')
    private readonly logger: ILogger,
  ) {}

  async handle(event: ContactSubmittedEvent): Promise<void> {
    try {
      const emailBody = this.buildEmailBody(event)

      await this.mail.send(
        process.env.ADMIN_EMAIL ?? 'your@email.com',
        `New Contact Message from ${event.name}`,
        emailBody,
      )

      this.logger.log(
        `Contact notification sent | From: ${event.name} <${event.email}>`,
        OnContactSubmitted.name,
      )
    } catch (error) {
      this.logger.error(
        `Failed to send contact notification | From: ${event.name}`,
        (error as Error).stack,
        OnContactSubmitted.name,
      )
    }
  }

  private buildEmailBody(event: ContactSubmittedEvent): string {
    return `
      <h3>New Contact Form Submission</h3>
      <p><strong>Name:</strong> ${this.escapeHtml(event.name)}</p>
      <p><strong>Email:</strong> ${this.escapeHtml(event.email)}</p>
      <p><strong>Time:</strong> ${event.occurredAt.toISOString()}</p>
      
      ${event.ipAddress ? `<p><strong>IP Address:</strong> ${event.ipAddress}</p>` : ''}
      ${event.browserInfo ? `<p><strong>Browser:</strong> ${this.escapeHtml(event.browserInfo)}</p>` : ''}

      <hr>
      <h4>Message:</h4>
      <p style="white-space: pre-wrap;">${this.escapeHtml(event.message)}</p>
    `.trim()
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}