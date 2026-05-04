import { Injectable, Inject } from '@nestjs/common'
import type {
    ICertificationWriteRepository,
    UpdateCertificationInput,
} from '../../../../domain/repositories/certification/ICertificationWriteRepository'
import type { CertificationDTO } from '../../../dtos/CertificationDTO'

interface Input extends UpdateCertificationInput {
    id: number
}

// =============================================================================
// UpdateCertificationCommand
// NotFoundError thrown by repository if id does not exist — no pre-check needed.
// O(1) — single DB query, no read-before-write.
// =============================================================================
@Injectable()
export class UpdateCertificationCommand {
    constructor(
        @Inject('ICertificationWriteRepository')
        private readonly repo: ICertificationWriteRepository,
    ) {}

    async execute(input: Input): Promise<CertificationDTO> {
        const { id, ...data } = input
        const c = await this.repo.update(id, data)
        return {
        id:        c.id,
        name:      c.name,
        url:       c.url,
        startDate: c.startDate.toISOString(),
        endDate:   c.endDate?.toISOString() ?? null,
        }
    }
}