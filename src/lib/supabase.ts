import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * The Supabase connection (accounts). Configured by VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY (.env, see SETUP.md); without both, Bronze runs
 * guest-only. The client library is fetched on first use, so the first page
 * never waits for it.
 */

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
export const supabaseConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY

/** Where supabase-js keeps the session (localStorage), so it survives reloads. */
export const SESSION_STORAGE_KEY = 'bronze.auth'

/** A profile row as signed-in players may read it (supabase/migrations/001 and 002). */
export type ProfileRow = {
  id: string
  username: string
  /** The sign-in provider's photo (Google). */
  avatar: string | null
  /** The player's own choice: 'preset:<id>' or an uploaded image. */
  avatar_url?: string | null
  bio?: string | null
  country?: string | null
  profile_visibility?: 'public' | 'friends' | 'private'
  history_visibility?: 'public' | 'friends' | 'private'
  phone_verified?: boolean
  card_verified?: boolean
  wins: number
  matches: number
  best_score: number
  goods_shipped: number
  maps_played: string[] | null
  achievements: Record<string, string> | null
  created_at: string
  needs_username: boolean
}

/** A player's email choices (through functions only). */
export type SettingsRow = { is_adult: boolean; email_marketing: boolean; email_friends: boolean; email_tournaments: boolean }

type NoArgs = Record<string, never>

/** The parts of the database the app uses. Types (not interfaces): supabase-js needs rows assignable to Record<string, unknown>. */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: never
        Update: Partial<Pick<ProfileRow, 'username' | 'avatar'>>
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      is_username_available: { Args: { name: string }; Returns: boolean }
      email_for_username: { Args: { name: string; password: string }; Returns: string | null }
      finish_signup: { Args: { p_username: string; p_age_band: string; p_marketing: boolean; p_terms_version: string }; Returns: ProfileRow[] }
      record_match_result: {
        Args: {
          score: number
          won: boolean
          p_match_id?: string
          p_goods_shipped?: number
          p_map_id?: string
          p_achievements?: string[]
          p_mode_id?: string
          p_players?: number
          p_placement?: number
          p_links?: number
          p_industries?: number
        }
        Returns: ProfileRow[]
      }
      merge_guest_stats: {
        Args: {
          p_merge_id: string
          p_matches: number
          p_wins: number
          p_best_score: number
          p_goods_shipped: number
          p_maps_played: string[]
          p_achievements: Record<string, string>
        }
        Returns: ProfileRow[]
      }
      delete_my_account: { Args: NoArgs; Returns: undefined }
      export_my_data: { Args: NoArgs; Returns: Record<string, unknown> }
      email_preferences: { Args: NoArgs; Returns: SettingsRow[] }
      set_email_preferences: { Args: { p_marketing: boolean; p_friends: boolean; p_tournaments: boolean; p_version: string }; Returns: SettingsRow[] }
      confirm_adult: { Args: NoArgs; Returns: SettingsRow[] }
      unsubscribe: { Args: { p_token: string; p_list: string }; Returns: boolean }
      // 002_profiles_security.sql
      check_my_password: { Args: { p_password: string }; Returns: boolean }
      change_username: { Args: { p_username: string; p_password: string | null }; Returns: string }
      update_profile_details: { Args: { p_bio: string; p_country: string | null }; Returns: ProfileRow[] }
      set_avatar: { Args: { p_value: string | null }; Returns: ProfileRow[] }
      set_privacy: { Args: { p_profile: string; p_history: string }; Returns: ProfileRow[] }
      my_account: { Args: NoArgs; Returns: Record<string, unknown> | null }
      get_public_profile: { Args: { p_username: string }; Returns: Record<string, unknown> | null }
      get_match_history: { Args: { p_username: string; p_page: number; p_page_size?: number }; Returns: Record<string, unknown> | null }
      report_user: { Args: { p_username: string; p_reason: string; p_details: string | null }; Returns: boolean }
      regenerate_recovery_codes: { Args: NoArgs; Returns: string[] }
      clear_recovery_codes: { Args: NoArgs; Returns: undefined }
      use_recovery_code: { Args: { p_code: string }; Returns: boolean }
      note_phone_attempt: { Args: NoArgs; Returns: boolean }
      note_card_check: { Args: NoArgs; Returns: boolean }
      remove_card_verification: { Args: NoArgs; Returns: ProfileRow[] }
      // 003_onboarding_ratings.sql
      my_onboarding: { Args: NoArgs; Returns: { step: number; done_at: string | null; can_pick_level: boolean; rules_accepted: boolean } }
      set_onboarding_step: { Args: { p_step: number }; Returns: undefined }
      accept_rules: { Args: { p_version: string }; Returns: undefined }
      finish_onboarding: { Args: { p_level: string }; Returns: { rating: number; map_id: string } }
      recent_sign_ins: {
        Args: NoArgs
        Returns: { id: string; signed_in_at: string; last_active_at: string; user_agent: string | null; ip: string | null; current: boolean }[]
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

export type BronzeSupabase = SupabaseClient<Database>

/** A client for the configured project, or null when accounts aren't configured (or the URL is malformed). */
export async function createSupabaseClient(): Promise<BronzeSupabase | null> {
  if (!supabaseConfigured) return null
  const { createClient } = await import('@supabase/supabase-js')
  try {
    return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // Codes (not tokens) come back in the URL, which keeps the hash routes intact.
        flowType: 'pkce',
        storageKey: SESSION_STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        // #/auth/callback and #/auth/reset finish redirects themselves.
        detectSessionInUrl: false,
      },
    })
  } catch (error) {
    console.error('Bronze accounts are misconfigured (check VITE_SUPABASE_URL):', error)
    return null
  }
}
