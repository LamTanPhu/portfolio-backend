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

import type { ProjectDTO, ProjectSummaryDTO } from '../../../application/dtos/ProjectDTO'

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
        return dtos.map((dto) => ProjectPresenter.toResponse(dto))
    }

    /**
     * Transform a single project summary for response
     */
    static toSummaryResponse(dto: ProjectSummaryDTO): ProjectSummaryDTO {
        return { ...dto }
    }

    /**
     * Transform a list of project summaries for response
     */
    static toSummaryListResponse(dtos: ProjectSummaryDTO[]): ProjectSummaryDTO[] {
        return dtos.map((dto) => ProjectPresenter.toSummaryResponse(dto))
    }
}
