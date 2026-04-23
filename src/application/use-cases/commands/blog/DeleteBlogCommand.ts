import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { IBlogReadRepository } from '../../../../domain/repositories/blog/IBlogReadRepository'
import type { IBlogWriteRepository } from '../../../../domain/repositories/blog/IBlogWriteRepository'

// =============================================================================
// DeleteBlogCommand
// Verifies blog exists before deletion — throws NotFoundError if not found.
// BlogTags cascade deleted automatically via onDelete: Cascade in schema.
// Read before delete — prevents silent no-ops on invalid ids.
// =============================================================================
@Injectable()
export class DeleteBlogCommand {
    constructor(
        @Inject('IBlogReadRepository')
        private readonly readRepo: IBlogReadRepository,
        @Inject('IBlogWriteRepository')
        private readonly writeRepo: IBlogWriteRepository,
    ) {}

    async execute(id: number): Promise<void> {
        // Verify existence — NotFoundError mapped to 404 by DomainExceptionFilter
        const blog = await this.readRepo.findById(id)
        if (!blog) throw new NotFoundError(`Blog not found: ${id}`)

        await this.writeRepo.delete(id)
    }
}