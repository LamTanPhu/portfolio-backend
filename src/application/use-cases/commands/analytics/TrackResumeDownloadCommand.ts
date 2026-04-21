import { Injectable } from '@nestjs/common'
import type { IResumeDownloadRepository } from '../../../../domain/repositories/resume/IResumeDownloadRepository'

@Injectable()
export class TrackResumeDownloadCommand {
    constructor(private readonly repo: IResumeDownloadRepository) {}

    async execute(ipAddress: string, browserInfo: string | null): Promise<void> {
        await this.repo.save({ ipAddress, browserInfo })
    }
}