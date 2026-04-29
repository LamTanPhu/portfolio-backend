import { Inject, Injectable } from '@nestjs/common'
import type { IEducationWriteRepository } from '../../../../domain/repositories/education/IEducationWriteRepository'

// =============================================================================
// DeleteEducationCommand
// NotFoundError thrown by repository if id does not exist — no pre-check needed.
// O(1) — single DB query, no read-before-write.
// =============================================================================
@Injectable()
export class DeleteEducationCommand {
    constructor(
        @Inject('IEducationWriteRepository')
        private readonly repo: IEducationWriteRepository,
    ) {}

    async execute(id: number): Promise<void> {
        await this.repo.delete(id)
    }
}