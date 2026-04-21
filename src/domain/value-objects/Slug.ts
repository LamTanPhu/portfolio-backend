import { ValidationError } from '../errors/ValidationError'

export class Slug {
  private readonly value: string

  constructor(raw: string) {
    const slugified = raw
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    if (!slugified) {
      throw new ValidationError(`Cannot create slug from: "${raw}"`)
    }

    this.value = slugified
  }

  static from(title: string): Slug {
    return new Slug(title)
  }

  toString(): string {
    return this.value
  }
}