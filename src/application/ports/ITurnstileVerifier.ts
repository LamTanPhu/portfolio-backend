export interface ITurnstileVerifier {
  verifyToken(token: string): Promise<boolean>
}
