// =============================================================================
// User — Aggregate Root
// Single record — the portfolio owner.
// hashPassword intentionally excluded — domain layer never exposes credentials.
// All child entities (Education, Job, Skill, etc.) are owned by User.
// =============================================================================
export class User {
  constructor(
    public readonly id:        number,
    public readonly firstname: string,
    public readonly lastname:  string,
    public readonly email:     string,
    public readonly aboutme:   string | null,
    public readonly lastLogin: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  get fullName(): string {
    return `${this.firstname} ${this.lastname}`
  }
}