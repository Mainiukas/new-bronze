import { describe, expect, it } from 'vitest'
import { serverBundleIsFresh } from '../../scripts/build-server.mjs'

describe('the Edge Function bundle', () => {
  it('is built from the current engine and server (run `npm run build:server` if not)', async () => {
    expect(await serverBundleIsFresh(), 'supabase/functions/_shared/game-server.js is out of date: run `npm run build:server`').toBe(true)
  }, 30000)
})
