import { Injectable, Inject } from '@nestjs/common'
import type { IBlogReadRepository } from '../../../../domain/repositories/blog/IBlogReadRepository'
import type { IBlogWriteRepository } from '../../../../domain/repositories/blog/IBlogWriteRepository'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'

@Injectable()
export class DeleteBlogCommand {
    constructor(
        @Inject('IBlogReadRepository')
        private readonly readRepo: IBlogReadRepository,
        @Inject('IBlogWriteRepository')
        private readonly writeRepo: IBlogWriteRepository,
    ) {}

    async execute(id: number): Promise<void> {
        // Verify existence before attempting delete
        const blog = await this.readRepo.findById(id)
        if (!blog) throw new NotFoundError(`Blog not found: ${id}`)

        await this.writeRepo.delete(id)
    }
}