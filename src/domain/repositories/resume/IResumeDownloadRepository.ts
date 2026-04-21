import type { ResumeDownload } from '../../entities/ResumeDownload';

export interface IResumeDownloadRepository {
    save(data: { ipAddress: string; browserInfo: string | null }): Promise<void>
    findAll(): Promise<ResumeDownload[]>
}