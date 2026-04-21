export class PageView {
  constructor(
    public readonly id: number,
    public readonly route: string,
    public readonly count: number,
    public readonly lastViewedAt: Date,
  ) {}
}