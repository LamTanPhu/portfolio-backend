export class ResumeDownload {
    constructor(
        public readonly id: number,
        public readonly ipAddress: string,
        public readonly browserInfo: string | null,
        public readonly downloadedAt: Date,
    ) {}
}