import { Injectable, Inject } from '@nestjs/common'
import type { ISkillReadRepository } from '../../../../domain/repositories/skill/ISkillReadRepository'
import type { SkillDTO } from '../../../dtos/SkillDTO'

// =============================================================================
// GetPublishedSkillsQuery
// Returns only public skills ordered by category alphabetically.
// isPublic filter applied at repository level — private skills never exposed.
// category serialized as string — SkillCategory enum never crosses layer boundary.
// =============================================================================
@Injectable()
export class GetPublishedSkillsQuery {
    constructor(
        @Inject('ISkillReadRepository')
        private readonly repo: ISkillReadRepository,
    ) {}

    async execute(): Promise<SkillDTO[]> {
        const skills = await this.repo.findPublished()
        return skills.map((s) => ({
            id:       s.id,
            name:     s.name,
            imageUrl: s.imageUrl,
            category: s.category,
        }))
    }
}