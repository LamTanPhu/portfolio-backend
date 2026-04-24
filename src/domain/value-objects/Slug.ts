import { ValidationError } from '../errors/ValidationError'

// =============================================================================
// Slug — Value Object
// Immutable URL-safe identifier generated from human-readable text.
// Rules: lowercase, hyphens only, no special characters, non-empty.
// Throws ValidationError if input produces empty slug after normalization.
// Used by CreateProjectCommand and CreateBlogCommand.
// =============================================================================
export class Slug {
  private readonly value: string

  constructor(raw: string) {
    const slugified = raw
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')           // spaces → hyphens
      .replace(/[^a-z0-9-]/g, '')     // strip non-alphanumeric except hyphens
      .replace(/^-+|-+$/g, '')        // strip leading/trailing hyphens
      .replace(/-{2,}/g, '-')         // collapse consecutive hyphens

    if (!slugified) {
      throw new ValidationError(`Cannot create slug from: "${raw}"`)
    }

    this.value = slugified
  }

  // Named constructor — more expressive than new Slug(title)
  static from(title: string): Slug {
    return new Slug(title)
  }

  toString(): string {
    return this.value
  }
}