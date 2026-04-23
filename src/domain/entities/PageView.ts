// =============================================================================
// PageView
// Per-route view counter — one record per unique route.
// lastViewedAt updated automatically via @updatedAt on every increment.
// =============================================================================
export class PageView {
  constructor(
    public readonly id:           number,
    public readonly route:        string,
    public readonly count:        number,
    public readonly lastViewedAt: Date,
  ) {}
}