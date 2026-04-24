import type { ProjectDTO } from '../../../application/dtos/ProjectDTO'

// =============================================================================
// ProjectPresenter
// Formats ProjectDTO for HTTP response.
// Static methods — no state, no dependencies.
// Separates response shaping from controller logic — SRP enforced.
// Currently passes through DTO directly — extend here to reshape if needed.
// =============================================================================
export class ProjectPresenter {
  static toResponse(dto: ProjectDTO): ProjectDTO {
    return { ...dto }
  }

  static toListResponse(dtos: ProjectDTO[]): ProjectDTO[] {
    return dtos.map(ProjectPresenter.toResponse)
  }
}