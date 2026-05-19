/**
 * @fileoverview DeleteEducationCommand
 * 
 * Deletes an education record and invalidates the public cache
 * so the frontend reflects the change immediately.
 */

import { Injectable, Inject } from '@nestjs/common'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { IEducationWriteRepository } from '../../../../domain/repositories/education/IEducationWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'

@Injectable()
export class DeleteEducationCommand {
    constructor(
        @Inject('IEducationWriteRepository')
        private readonly repo: IEducationWriteRepository,

        @Inject('ICacheInvalidationService')
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(id: number): Promise<void> {
        await this.repo.delete(id)

        // Invalidate public education list cache
        await this.cacheService.invalidatePublicEducation()
    }
}