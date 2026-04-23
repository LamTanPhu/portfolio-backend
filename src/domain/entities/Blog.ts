import { BlogTag } from './BlogTag'

// =============================================================================
// Blog — Aggregate Root
// Owns BlogTag — tags are never fetched or persisted standalone.
// searchVector (tsvector) exists in DB but is excluded from domain —
// it is populated automatically by a PostgreSQL trigger, never by application code.
// =============================================================================
export class Blog {
  constructor(
    public readonly id:          number,
    public readonly title:       string,
    public readonly slug:        string,
    public readonly content:     string,
    public readonly excerpt:     string | null,
    public readonly tags:        BlogTag[],
    public readonly isPublished: boolean,
    public readonly publishedAt: Date | null,
    public readonly userId:      number,
    public readonly createdAt:   Date,
    public readonly updatedAt:   Date,
  ) {}
}