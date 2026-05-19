/**
 * @fileoverview ProjectPresenter
 * 
 * Responsible for shaping ProjectDTOs before sending them to the client.
 * Follows the Presentation layer pattern — keeps controllers thin.
 * 
 * Currently acts as a pass-through. Extend this class in the future if you need:
 * - Field filtering
 * - Additional computed properties
 * - Date formatting changes
 * - Data transformation for specific clients
 */

import type { ProjectDTO } from '../../../application/dtos/ProjectDTO'

export class ProjectPresenter {
  /**
   * Transform single project for response
   */
  static toResponse(dto: ProjectDTO): ProjectDTO {
    return { ...dto }
  }

  /**
   * Transform list of projects for response
   */
  static toListResponse(dtos: ProjectDTO[]): ProjectDTO[] {
    return dtos.map(ProjectPresenter.toResponse)
  }
}