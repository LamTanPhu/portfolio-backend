import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { ISkillReadRepository } from '../../../../domain/repositories/skill/ISkillReadRepository'
import type { ISkillWriteRepository } from '../../../../domain/repositories/skill/ISkillWriteRepository'

// =============================================================================
// DeleteSkillCommand
// Deletes a skill — verifies existence before deletion.
// =============================================================================
@Injectable()
export class DeleteSkillCommand {
    constructor(
        @Inject('ISkillReadRepository')
        private readonly readRepo: ISkillReadRepository,
        @Inject('ISkillWriteRepository')
        private readonly writeRepo: ISkillWriteRepository,
    ) {}

    async execute(id: number): Promise<void> {
        const skill = await this.readRepo.findById(id)
        if (!skill) throw new NotFoundError(`Skill not found: ${id}`)
        await this.writeRepo.delete(id)
    }
}