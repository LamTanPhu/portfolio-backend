import { Injectable, Inject } from '@nestjs/common'
import type {
    ICertificationWriteRepository,
    CreateCertificationInput,
} from '../../../../domain/repositories/certification/ICertificationWriteRepository'
import type { CertificationDTO } from '../../../dtos/CertificationDTO'

// =============================================================================
// CreateCertificationCommand
// Creates a new certification record for the portfolio owner.
// userId from verified JWT payload — never from client input.
// =============================================================================
@Injectable()
export class CreateCertificationCommand {
    constructor(
        @Inject('ICertificationWriteRepository')
        private readonly repo: ICertificationWriteRepository,
    ) {}

    async execute(input: CreateCertificationInput): Promise<CertificationDTO> {
        const c = await this.repo.create(input)
        return {
        id:        c.id,
        name:      c.name,
        url:       c.url,
        startDate: c.startDate.toISOString(),
        endDate:   c.endDate?.toISOString() ?? null,
        }
    }
}