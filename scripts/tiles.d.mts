/** Problems that stop a build: a stale src/rules/tiles.ts, or values still TODO in docs/TILES.md. */
export function tilesProblems(options?: { allowTodo?: boolean }): string[]
