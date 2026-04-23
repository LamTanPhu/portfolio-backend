// =============================================================================
// Job — Owned by User aggregate
// Represents a work experience entry.
// endedAt null = currently employed at this company.
// =============================================================================
export class Job {
  constructor(
    public readonly id:          number,
    public readonly companyName: string,
    public readonly role:        string,
    public readonly startedAt:   Date,
    public readonly endedAt:     Date | null,
    public readonly isEnded:     boolean,
    public readonly userId:      number,
    public readonly createdAt:   Date,
    public readonly updatedAt:   Date,
  ) {}
}