// =============================================================================
// SocialAccount — Owned by User aggregate
// Represents a public social profile link (GitHub, LinkedIn, etc.).
// isPublic false = private account — never returned by public endpoints.
// =============================================================================
export class SocialAccount {
  constructor(
    public readonly id:        number,
    public readonly name:      string,
    public readonly url:       string,
    public readonly imageUrl:  string | null,
    public readonly isPublic:  boolean,
    public readonly userId:    number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}