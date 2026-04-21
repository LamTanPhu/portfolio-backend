export class Education {
  constructor(
    public readonly id: number,
    public readonly degreeName: string,
    public readonly instituteName: string,
    public readonly instituteUrl: string | null,
    public readonly startedAt: Date,
    public readonly endedAt: Date | null,
    public readonly isCompleted: boolean,
    public readonly userId: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}