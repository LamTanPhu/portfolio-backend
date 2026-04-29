import { Inject, Injectable } from '@nestjs/common'
import type {
    CreateEducationInput,
    IEducationWriteRepository,
} from '../../../../domain/repositories/education/IEducationWriteRepository'
import type { EducationDTO } from '../../../dtos/EducationDTO'

// =============================================================================
// CreateEducationCommand
// Creates a new education record for the portfolio owner.
// userId from verified JWT payload — never from client input.
// Dates stored as Date objects — ISO string conversion happens at DTO level.
// =============================================================================
@Injectable()
export class CreateEducationCommand {
    constructor(
        @Inject('IEducationWriteRepository')
        private readonly repo: IEducationWriteRepository,
    ) {}

    async execute(input: CreateEducationInput): Promise<EducationDTO> {
        const e = await this.repo.create(input)
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