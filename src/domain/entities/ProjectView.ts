// =============================================================================
// ProjectView — Owned by Project aggregate
// Daily view counter — one record per project per day.
// Never fetched standalone — always via Project or IProjectViewRepository.
// Upsert pattern prevents unbounded row growth.
// =============================================================================
export class ProjectView {
    constructor(
        public readonly id:        number,
        public readonly projectId: number,
        public readonly date:      Date,
        public readonly count:     number,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
    ) {}
}