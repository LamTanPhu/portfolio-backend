/**
 * @fileoverview ISnakeCaptchaVerifier
 *
 * Application port for the in-house "snake game" anti-bot check that runs
 * alongside (never instead of) Turnstile on the contact form. Mirrors
 * ITurnstileVerifier's shape: guards and controllers depend on this
 * abstraction, not the concrete implementation.
 *
 * Deliberately a thin, plausibility-based check rather than a full
 * server-side replay of the game engine — see SnakeCaptchaService for the
 * reasoning. It raises the bar against generic spam bots hitting this
 * endpoint directly; it is not a cryptographically airtight anti-cheat.
 */

export interface SnakeCompletionInput {
    /** Challenge ID previously issued by issueChallenge(). */
    challengeId: string
    /** Food items eaten during the playthrough being reported. */
    eaten: number
    /** Milliseconds elapsed from game start to the win condition. */
    durationMs: number
    /** Number of direction-change inputs made during the playthrough. */
    moveCount: number
}

export interface ISnakeCaptchaVerifier {
    /**
     * Issues a fresh, single-use challenge ID for a new game.
     * @returns The challenge ID the frontend must echo back on completion.
     */
    issueChallenge(): Promise<string>

    /**
     * Verifies a reported game completion against its challenge and basic
     * plausibility checks. Single-use — the challenge is consumed whether
     * or not verification ultimately succeeds.
     * @returns A short-lived signed proof token on success, or null on any
     *          failure (unknown/expired/already-used challenge, incomplete
     *          game, or implausible timing).
     */
    verifyCompletion(input: SnakeCompletionInput): Promise<string | null>

    /**
     * Verifies a proof token previously issued by verifyCompletion().
     * Used by SnakeCaptchaGuard to gate the actual contact submission.
     */
    verifyProof(token: string): Promise<boolean>
}
