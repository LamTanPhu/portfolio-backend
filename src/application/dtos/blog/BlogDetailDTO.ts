import { BlogSummaryDTO } from './BlogSummaryDTO'

export interface BlogDetailDTO extends BlogSummaryDTO {
    content: string
}
