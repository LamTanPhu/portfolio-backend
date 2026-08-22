/**
 * @fileoverview BlogPresenter
 *
 * Responsible for transforming Application-layer DTOs into HTTP response shapes.
 *
 * Benefits of having a Presenter:
 * - Single place to control response format
 * - Easy to add computed fields, hide sensitive data, format dates, etc.
 * - Keeps Controllers clean
 * - Follows the Interface Adapter layer responsibility
 */

import type { BlogDetailDTO } from '../../../application/dtos/blog/BlogDetailDTO'
import type { BlogSummaryDTO } from '../../../application/dtos/blog/BlogSummaryDTO'

export class BlogPresenter {
    /**
     * Transforms a single blog detail for HTTP response.
     * Currently a pass-through, but ready for future transformations.
     */
    static toDetailResponse(dto: BlogDetailDTO): BlogDetailDTO {
        return {
            ...dto,
            // Example of future transformation:
            // publishedAt: dto.publishedAt ? dto.publishedAt.toISOString() : null,
        }
    }

    /**
     * Transforms a single blog summary.
     */
    static toSummaryResponse(dto: BlogSummaryDTO): BlogSummaryDTO {
        return { ...dto }
    }

    /**
     * Transforms a list of blog summaries.
     */
    static toSummaryListResponse(dtos: BlogSummaryDTO[]): BlogSummaryDTO[] {
        return dtos.map(BlogPresenter.toSummaryResponse)
    }
}
