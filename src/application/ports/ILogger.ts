// =============================================================================
// ILogger
// Application port for logging.
// Use cases and services depend on this interface — never on NestJS Logger directly.
// Infrastructure layer (NestLogger) implements this — swappable without code changes.
// =============================================================================
export interface ILogger {
  log(message: string, context?: string): void
  warn(message: string, context?: string): void
  error(message: string, trace?: string, context?: string): void
}