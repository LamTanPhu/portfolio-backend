import { ValidationError } from '../errors/ValidationError'

// =============================================================================
// Slug — Value Object
// Immutable URL-safe identifier generated from human-readable text.
// Rules: lowercase, hyphens only, no special characters, non-empty.
//
// Unicode handling: NFD normalization strips diacritics before slugifying,
// so Vietnamese/accented titles produce readable slugs instead of throwing.
// e.g. "Lâm Tấn Phú" → "lam-tan-phu"
//      "Việt Nam"     → "viet-nam"
//
// Throws ValidationError only if input produces an empty slug after full
// normalization (e.g. input is purely symbols with no alphanumeric content).
//
// Used by CreateProjectCommand and CreateBlogCommand.
// =============================================================================
export class Slug {
    private readonly value: string

    constructor(raw: string) {
        const slugified = raw
            .normalize('NFD') // decompose accented chars: "â" → "a" + combining char
            .replace(/[\u0300-\u036f]/g, '') // strip combining diacritical marks
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-') // spaces → hyphens
            .replace(/[^a-z0-9-]/g, '') // strip non-alphanumeric except hyphens
            .replace(/^-+|-+$/g, '') // strip leading/trailing hyphens
            .replace(/-{2,}/g, '-') // collapse consecutive hyphens

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
