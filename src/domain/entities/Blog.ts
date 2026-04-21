export class Blog {
  constructor(
    public readonly id: number,
    public readonly title: string,
    public readonly slug: string,
    public readonly content: string,
    public readonly excerpt: string | null,
    public readonly tags: BlogTag[],
    public readonly isPublished: boolean,
    public readonly publishedAt: Date | null,
    public readonly userId: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

// Imported below to avoid circular — defined here as Blog owns BlogTag
import { BlogTag } from './BlogTag'