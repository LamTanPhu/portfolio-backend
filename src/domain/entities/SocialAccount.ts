export class SocialAccount {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly url: string,
    public readonly imageUrl: string | null,
    public readonly isPublic: boolean,
    public readonly userId: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}