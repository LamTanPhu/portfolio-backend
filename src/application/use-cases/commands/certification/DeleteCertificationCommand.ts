import { Injectable, Inject } from '@nestjs/common'
import type { ICertificationWriteRepository } from '../../../../domain/repositories/certification/ICertificationWriteRepository'

// =============================================================================
// DeleteCertificationCommand
// NotFoundError thrown by repository if id does not exist — no pre-check needed.
// O(1) — single DB query, no read-before-write.
// =============================================================================
@Injectable()
export class DeleteCertificationCommand {
    constructor(
        @Inject('ICertificationWriteRepository')
        private readonly repo: ICertificationWriteRepository,
    ) {}

    async execute(id: number): Promise<void> {
        await this.repo.delete(id)
    }
}