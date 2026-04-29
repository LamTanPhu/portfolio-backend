import type { SocialAccount } from '../../entities/SocialAccount'

// =============================================================================
// CreateSocialAccountInput
// =============================================================================
export interface CreateSocialAccountInput {
    name:     string
    url:      string
    imageUrl: string | null
    isPublic: boolean
    userId:   number
}

// =============================================================================
// UpdateSocialAccountInput
// =============================================================================
export interface UpdateSocialAccountInput {
    name?:     string
    url?:      string
    imageUrl?: string | null
    isPublic?: boolean
}

// =============================================================================
// ISocialAccountWriteRepository
// Write interface for SocialAccount aggregate — separated from read per ISP.
// =============================================================================
export interface ISocialAccountWriteRepository {
    create(data: CreateSocialAccountInput): Promise<SocialAccount>
    update(id: number, data: UpdateSocialAccountInput): Promise<SocialAccount>
    delete(id: number): Promise<void>
}