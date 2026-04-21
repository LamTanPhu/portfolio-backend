import type { BlogDTO } from '../../../application/dtos/BlogDTO'

export class BlogPresenter {
    static toResponse(dto: BlogDTO) {
        return { ...dto }
    }

    static toListResponse(dtos: BlogDTO[]) {
        return dtos.map(BlogPresenter.toResponse)
    }
}