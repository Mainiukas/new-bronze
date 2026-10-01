/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://abcd1234.supabase.co (see SETUP.md). Unset: guest-only. */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anon (public) key. Unset: guest-only. */
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Stripe publishable key (pk_test_… or pk_live_…), for the optional card check. Unset: the option is hidden. */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
