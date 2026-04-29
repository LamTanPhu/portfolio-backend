import { Inject, Injectable } from '@nestjs/common'
import type {
    IEducationWriteRepository,
    UpdateEducationInput,
} from '../../../../domain/repositories/education/IEducationWriteRepository'
import type { EducationDTO } from '../../../dtos/EducationDTO'

interface Input extends UpdateEducationInput {
    id: number
}

// =============================================================================
// UpdateEducationCommand
// NotFoundError thrown by repository if id does not exist — no pre-check needed.
// O(1) — single DB query, no read-before-write.
// =============================================================================
@Injectable()
export class UpdateEducationCommand {
    constructor(
        @Inject('IEducationWriteRepository')
        private readonly repo: IEducationWriteRepository,
    ) {}

    async execute(input: Input): Promise<EducationDTO> {
        const { id, ...data } = input
        const e = await this.repo.update(id, data)
        return {
        id:            e.id,
        degreeName:    e.degreeName,
        instituteName: e.instituteName,
        instituteUrl:  e.instituteUrl,
        startedAt:     e.startedAt.toISOString(),
        endedAt:       e.endedAt?.toISOString() ?? null,
        isCompleted:   e.isCompleted,
        }
    }
}