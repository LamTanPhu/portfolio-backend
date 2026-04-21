export class User {
  constructor(
    public readonly id: number,
    public readonly firstname: string,
    public readonly lastname: string,
    public readonly email: string,
    // hashPassword intentionally excluded — never expose in domain layer
    public readonly aboutme: string | null,
    public readonly lastLogin: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  get fullName(): string {
    return `${this.firstname} ${this.lastname}`
  }
}