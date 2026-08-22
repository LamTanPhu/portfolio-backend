/**
 * @fileoverview Analytics DTOs (Request Models)
 *
 * Defines and validates incoming bodies for public analytics endpoints.
 * All public endpoints are on the hot path — tight validation is critical.
 */

import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

// =============================================================================
// TrackPageViewDto
//
// Validates the route string submitted by the frontend on page navigation.
// Previously the route was extracted raw with @Body('route') — no validation,
// no length cap, no format check. An attacker could:
//   - Inject arbitrary strings into the page_views table
//   - Send 10KB+ payloads (DB throws P2000 which leaks info in dev)
//   - Store XSS payloads in the route column (served back on admin dashboard)
//
// Validation rules:
//   - Must be a string (not array, object, number etc.)
//   - Non-empty after whitespace trimming
//   - Max 255 chars (matches VARCHAR(255) in DB schema)
//   - Only valid URL path characters: lowercase letters, digits, hyphens, slashes
//   - Must start with / (all frontend routes do; catches injection attempts)
//
// NOTE: The allowlist regex is intentional — it is better to be strict here
// and adjust as needed, rather than open by default. If your frontend uses
// query strings in the route value, expand the pattern accordingly.
// =============================================================================
export class TrackPageViewDto {
    @ApiProperty({
        description: 'Frontend route path that was visited',
        example: '/projects/electric-motorcycle-rental',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    @Matches(/^\/[a-z0-9\-\/]*$/, {
        message: 'route must be a valid URL path (lowercase, hyphens, slashes only, starting with /)',
    })
    route!: string
}
