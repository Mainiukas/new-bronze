/** A small seeded random generator (mulberry32), its state kept in the game state so replays match. */

/** A number in [0, 1) and the generator's next state. */
export function nextRandom(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) | 0
  const next = t
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next]
}

/** Shuffles a copy of `items` (Fisher–Yates). Returns it and the generator's next state. */
export function shuffle<T>(items: readonly T[], state: number): [T[], number] {
  const out = [...items]
  let s = state
  for (let i = out.length - 1; i > 0; i--) {
    const [r, next] = nextRandom(s)
    s = next
    const j = Math.floor(r * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return [out, s]
}
