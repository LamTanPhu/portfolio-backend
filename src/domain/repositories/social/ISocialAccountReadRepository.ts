import type { SocialAccount } from '../../entities/SocialAccount'

// =============================================================================
// ISocialAccountReadRepository
// Read interface for SocialAccount aggregate.
// Only public accounts returned via findPublic — private ones hidden.
// =============================================================================
export interface ISocialAccountReadRepository {
    findPublic(): Promise<SocialAccount[]>
    findAll(): Promise<SocialAccount[]>
}