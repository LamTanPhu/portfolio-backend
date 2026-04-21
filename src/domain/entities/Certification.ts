export class Certification {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly url: string,
    public readonly isPublished: boolean,
    public readonly startDate: Date,
    public readonly endDate: Date | null,
    public readonly userId: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}