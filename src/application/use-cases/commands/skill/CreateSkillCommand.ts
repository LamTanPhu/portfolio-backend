import { Inject, Injectable } from '@nestjs/common'
import type { CreateSkillInput, ISkillWriteRepository } from '../../../../domain/repositories/skill/ISkillWriteRepository'
import type { SkillDTO } from '../../../dtos/SkillDTO'

// =============================================================================
// CreateSkillCommand
// Creates a new skill record for the portfolio owner.
// userId from verified JWT payload — never from client input.
// =============================================================================
@Injectable()
export class CreateSkillCommand {
    constructor(
        @Inject('ISkillWriteRepository')
        private readonly repo: ISkillWriteRepository,
    ) {}

    async execute(input: CreateSkillInput): Promise<SkillDTO> {
        const skill = await this.repo.create(input)
        return {
            id:       skill.id,
            name:     skill.name,
            imageUrl: skill.imageUrl,
            category: skill.category,
        }
    }
}