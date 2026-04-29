import { Inject, Injectable } from '@nestjs/common'
import type { IJobWriteRepository } from '../../../../domain/repositories/job/IJobWriteRepository'

// =============================================================================
// DeleteJobCommand
// NotFoundError thrown by repository if id does not exist — no pre-check needed.
// O(1) — single DB query, no read-before-write.
// =============================================================================
@Injectable()
export class DeleteJobCommand {
    constructor(
        @Inject('IJobWriteRepository')
        private readonly repo: IJobWriteRepository,
    ) {}

    async execute(id: number): Promise<void> {
        await this.repo.delete(id)
    }
}