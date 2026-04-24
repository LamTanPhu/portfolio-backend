import { Injectable, Inject } from '@nestjs/common'
import type { ISkillWriteRepository, UpdateSkillInput } from '../../../../domain/repositories/skill/ISkillWriteRepository'
import type { ISkillReadRepository } from '../../../../domain/repositories/skill/ISkillReadRepository'
import type { SkillDTO } from '../../../dtos/SkillDTO'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'

interface Input extends UpdateSkillInput {
  id: number
}

// =============================================================================
// UpdateSkillCommand
// Updates an existing skill — verifies existence before update.
// =============================================================================
@Injectable()
export class UpdateSkillCommand {
    constructor(
        @Inject('ISkillReadRepository')
        private readonly readRepo: ISkillReadRepository,
        @Inject('ISkillWriteRepository')
        private readonly writeRepo: ISkillWriteRepository,
    ) {}

    async execute(input: Input): Promise<SkillDTO> {
        const { id, ...data } = input
        const existing = await this.readRepo.findById(id)
        if (!existing) throw new NotFoundError(`Skill not found: ${id}`)

        const skill = await this.writeRepo.update(id, data)
        return {
        id:       skill.id,
        name:     skill.name,
        imageUrl: skill.imageUrl,
        category: skill.category,
        }
    }
}