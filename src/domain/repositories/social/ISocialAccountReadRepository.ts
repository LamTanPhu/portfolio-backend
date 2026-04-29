import type { SocialAccount } from '../../entities/SocialAccount'

// =============================================================================
// ISocialAccountReadRepository
// Read interface for SocialAccount aggregate.
// findPublic returns only isPublic accounts — private accounts never exposed.
// findAll returns all accounts — admin use only.
// findById used by write commands to verify existence.
// =============================================================================
export interface ISocialAccountReadRepository {
    findPublic(): Promise<SocialAccount[]>
    findAll(): Promise<SocialAccount[]>
    findById(id: number): Promise<SocialAccount | null>
}