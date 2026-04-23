// =============================================================================
// BlogTag — Owned by Blog aggregate
// Never persisted or fetched independently — always via Blog.
// Unique constraint [blogId, name] enforced at DB level.
// =============================================================================
export class BlogTag {
    constructor(
        public readonly id:     number,
        public readonly name:   string,
        public readonly blogId: number,
    ) {}
}