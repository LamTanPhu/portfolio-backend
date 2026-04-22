// =============================================================================
// ProjectView
// Owned by Project aggregate — no standalone repository.
// Represents a daily view count for a project.
// Daily bucketing prevents unbounded row growth.
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