/**
 * @fileoverview IHealthCheckService
 *
 * Application port — the health check equivalent of ITokenRepository or
 * ICacheQueryService. No domain entity backs this (health has no identity
 * or invariants to enforce, unlike Blog/Skill/Project), but "can we reach
 * the database right now" is still an infrastructure concern that belongs
 * behind a port, not called directly from the controller.
 */
export interface IHealthCheckService {
    checkDatabase(): Promise<boolean>
}