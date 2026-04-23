// =============================================================================
// Certification — Owned by User aggregate
// Represents a professional certification.
// endDate null = no expiry / lifetime certification.
// isPublished controls public visibility — draft certs hidden from portfolio.
// =============================================================================
export class Certification {
  constructor(
    public readonly id:          number,
    public readonly name:        string,
    public readonly url:         string,
    public readonly isPublished: boolean,
    public readonly startDate:   Date,
    public readonly endDate:     Date | null,
    public readonly userId:      number,
    public readonly createdAt:   Date,
    public readonly updatedAt:   Date,
  ) {}
}