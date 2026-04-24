import type { SocialAccount } from '../../entities/SocialAccount'

// =============================================================================
// ISocialAccountReadRepository
// Read interface for SocialAccount aggregate.
// findPublic returns only isPublic accounts — private accounts never exposed.
// findAll returns all accounts — admin use only.
// Both ordered by name alphabetically at repository level.
// =============================================================================
export interface ISocialAccountReadRepository {
    findPublic(): Promise<SocialAccount[]>
    findAll(): Promise<SocialAccount[]>
}