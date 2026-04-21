import { ProjectDTO } from '../../../application/dtos/ProjectDTO'

export class ProjectPresenter {
  static toResponse(dto: ProjectDTO) {
    return { ...dto }
  }

  static toListResponse(dtos: ProjectDTO[]) {
    return dtos.map(ProjectPresenter.toResponse)
  }
}
