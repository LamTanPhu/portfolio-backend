/**
 * @fileoverview ITurnstileVerifier
 *
 * Application port for Cloudflare Turnstile bot protection.
 * Guards and services depend on this abstraction, not on concrete implementation.
 */

export interface ITurnstileVerifier {
    /**
     * Verifies a Turnstile token.
     * @param token - The Turnstile response token from the client
     * @returns True if verification succeeds
     */
    verifyToken(token: string): Promise<boolean>
}
