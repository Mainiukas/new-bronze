import { useState } from 'react'
import type { PlayerColor } from '../game/types'
import { PLAYER_STYLE } from './game/glyphs'
import { Seal } from './theme/Ornaments'

/** The signed-in player as the lobby shows them: username, photo or colour, and their record. */
export interface LobbyProfile {
  name: string
  color: PlayerColor
  /** Google photo, if they signed in with Google. */
  avatarUrl: string | null
  wins: number
  matches: number
}

/** Their Google photo, or a disc in their colour with their initial, set in the brass cog seal. */
export function ProfileAvatar({ profile, className = 'size-10 text-lg' }: { profile: LobbyProfile; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  const ring = 'shrink-0 rounded-full border-2 border-soot-950 shadow-[0_0_0_1px_rgb(232_181_124/0.55),0_4px_12px_-4px_rgb(0_0_0/0.9)]'
  return (
    <Seal>
      {profile.avatarUrl && failed !== profile.avatarUrl ? (
        <img
          src={profile.avatarUrl}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          onError={() => setFailed(profile.avatarUrl)}
          className={`${ring} object-cover ${className}`}
        />
      ) : (
        <span
          aria-hidden="true"
          className={`${ring} grid place-items-center font-display leading-none font-extrabold text-soot-950 uppercase ${className}`}
          style={{ background: PLAYER_STYLE[profile.color].hex }}
        >
          {profile.name.trim().charAt(0) || '?'}
        </span>
      )}
    </Seal>
  )
}
