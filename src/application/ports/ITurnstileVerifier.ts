// =============================================================================
// ITurnstileVerifier
// Application port for Cloudflare Turnstile bot verification.
// TurnstileGuard depends on this interface — never on TurnstileVerifier directly.
// Infrastructure layer (TurnstileVerifier) implements this.
// =============================================================================
export interface ITurnstileVerifier {
  verifyToken(token: string): Promise<boolean>
}