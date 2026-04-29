import { Inject, Injectable } from '@nestjs/common'
import type {
    ISkillWriteRepository,
    UpdateSkillInput,
} from '../../../../domain/repositories/skill/ISkillWriteRepository'
import type { SkillDTO } from '../../../dtos/SkillDTO'

interface Input extends UpdateSkillInput {
    id: number
}

// =============================================================================
// UpdateSkillCommand
// NotFoundError thrown by repository if id does not exist — no pre-check needed.
// O(1) — single DB query, no read-before-write.
// =============================================================================
@Injectable()
export class UpdateSkillCommand {
    constructor(
        @Inject('ISkillWriteRepository')
        private readonly repo: ISkillWriteRepository,
    ) {}

    async execute(input: Input): Promise<SkillDTO> {
        const { id, ...data } = input
        const skill = await this.repo.update(id, data)
        return {
        id:       skill.id,
        name:     skill.name,
        imageUrl: skill.imageUrl,
        category: skill.category,
        }
    }
}