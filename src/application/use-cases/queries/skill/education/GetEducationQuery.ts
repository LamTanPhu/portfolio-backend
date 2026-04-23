import { Injectable, Inject } from '@nestjs/common'
import type { IEducationReadRepository } from '../../../../../domain/repositories/education/IEducationReadRepository'
import type { EducationDTO } from '../../../../dtos/EducationDTO'

// =============================================================================
// GetEducationQuery
// Returns all education records ordered by most recent first.
// No publish filter — all education records shown publicly.
// endedAt null = currently enrolled.
// Dates serialized as ISO 8601 strings — domain Date objects never cross layers.
// =============================================================================
@Injectable()
export class GetEducationQuery {
    constructor(
        @Inject('IEducationReadRepository')
        private readonly repo: IEducationReadRepository,
    ) {}

    async execute(): Promise<EducationDTO[]> {
        const records = await this.repo.findAll()
        return records.map((e) => ({
            id:            e.id,
            degreeName:    e.degreeName,
            instituteName: e.instituteName,
            instituteUrl:  e.instituteUrl,
            startedAt:     e.startedAt.toISOString(),
            endedAt:       e.endedAt?.toISOString() ?? null,
            isCompleted:   e.isCompleted,
        }))
    }
}