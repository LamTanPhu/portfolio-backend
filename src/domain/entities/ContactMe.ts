export class ContactMe {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly email: string,
    public readonly message: string,
    public readonly ipAddress: string,
    public readonly browserInfo: string | null,
    public readonly createdAt: Date,
  ) {}
}