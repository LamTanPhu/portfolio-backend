// =============================================================================
// ContactMe
// Write-only — contact messages are never edited or deleted via domain.
// No userId FK — public form, not tied to admin user.
// browserInfo null-safe — not all clients send User-Agent headers.
// =============================================================================
export class ContactMe {
  constructor(
    public readonly id:          number,
    public readonly name:        string,
    public readonly email:       string,
    public readonly message:     string,
    public readonly ipAddress:   string,
    public readonly browserInfo: string | null,
    public readonly createdAt:   Date,
  ) {}
}