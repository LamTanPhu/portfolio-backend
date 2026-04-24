import type { BlogDTO } from '../../../application/dtos/BlogDTO'

// =============================================================================
// BlogPresenter
// Formats BlogDTO for HTTP response.
// Static methods — no state, no dependencies.
// Separates response shaping from controller logic — SRP enforced.
// Currently passes through DTO directly — extend here to reshape if needed.
// =============================================================================
export class BlogPresenter {
    static toResponse(dto: BlogDTO): BlogDTO {
        return { ...dto }
    }

    static toListResponse(dtos: BlogDTO[]): BlogDTO[] {
        return dtos.map(BlogPresenter.toResponse)
    }
}