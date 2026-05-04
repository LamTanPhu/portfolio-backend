import { Inject, Injectable } from '@nestjs/common'
import type { IProjectWriteRepository } from '../../../../domain/repositories/project/IProjectWriteRepository'

// =============================================================================
// DeleteProjectCommand
// NotFoundError thrown by repository if id does not exist — no pre-check needed.
// O(1) — single DB query, no read-before-write.
// =============================================================================
@Injectable()
export class DeleteProjectCommand {
    constructor(
        @Inject('IProjectWriteRepository')
        private readonly repo: IProjectWriteRepository,
    ) {}

    async execute(id: number): Promise<void> {
        await this.repo.delete(id)
    }
}