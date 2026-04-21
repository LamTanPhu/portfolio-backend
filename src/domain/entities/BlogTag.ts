export class BlogTag {
    constructor(
        public readonly id: number,
        public readonly name: string,
        public readonly blogId: number,
    ) {}
}