/**
 * @fileoverview unique()
 *
 * Every spec that creates a row via POST embeds this in titles/names/slugs
 * so re-running `npm run test:e2e` against the same database twice (nobody
 * resets the test DB between local runs) never collides with a unique
 * constraint (slug, email, etc.) left over from the previous run. Specs
 * still delete what they create where practical, but this is the actual
 * safety net.
 */

let counter = 0

export function unique(label: string): string {
    counter += 1
    return `e2e-${label}-${Date.now()}-${counter}`
}
