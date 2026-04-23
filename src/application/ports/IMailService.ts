// =============================================================================
// IMailService
// Application port for email delivery.
// Use cases depend on this interface — never on Resend/Nodemailer directly.
// Infrastructure layer (MailService) implements this — swappable without code changes.
// =============================================================================
export interface IMailService {
  send(to: string, subject: string, body: string): Promise<void>
}