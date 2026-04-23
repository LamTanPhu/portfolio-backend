// =============================================================================
// Project — Aggregate Root
// Owns ProjectView — daily view counts accessed only via Project.
// techStack stored as JSONB in DB — mapped to string[] in domain.
// =============================================================================
export class Project {
  constructor(
    public readonly id:           number,
    public readonly name:         string,
    public readonly description:  string,
    public readonly slug:         string,
    public readonly techStack:    string[],
    public readonly repoUrl:      string | null,
    public readonly liveUrl:      string | null,
    public readonly thumbnailUrl: string | null,
    public readonly isPublished:  boolean,
    public readonly isOpenSource: boolean,
    public readonly userId:       number,
    public readonly createdAt:    Date,
    public readonly updatedAt:    Date,
  ) {}
}