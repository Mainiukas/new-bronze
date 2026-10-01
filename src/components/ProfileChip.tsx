import { useState } from 'react'
import { presetAvatar } from '../data/avatars'
import type { PlayerColor } from '../game/types'
import { PLAYER_STYLE } from './game/glyphs'
import { Seal } from './theme/Ornaments'

/** The signed-in player as the lobby shows them: username, avatar or colour, and their record. */
export interface LobbyProfile {
  name: string
  color: PlayerColor
  /** Their avatar: an illustrated one ('preset:<id>'), an uploaded picture, or the Google photo. */
  avatarUrl: string | null
  wins: number
  matches: number
}

const COLORS = Object.keys(PLAYER_STYLE) as PlayerColor[]

/** A steady colour for a name (for players whose colour we don't know). */
const colorFor = (name: string): PlayerColor => COLORS[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % COLORS.length]

/**
 * An avatar in the brass cog seal: an illustrated avatar, a picture, or a
 * disc in the player's colour with their initial (also when a picture fails).
 */
export function Avatar({ name, url, color, className = 'size-10 text-lg' }: { name: string; url: string | null; color?: PlayerColor; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  const ring = 'shrink-0 rounded-full border-2 border-soot-950 shadow-[0_0_0_1px_rgb(232_181_124/0.55),0_4px_12px_-4px_rgb(0_0_0/0.9)]'
  const preset = presetAvatar(url)
  if (preset)
    return (
      <Seal>
        <span aria-hidden="true" className={`${ring} block overflow-hidden ${className}`} style={{ background: preset.ground ?? '#1b1714' }}>
          <img
            src={preset.src}
            alt=""
            draggable={false}
            className={`size-full ${preset.fit === 'cover' ? 'object-cover' : 'scale-90 object-contain drop-shadow-[0_2px_3px_rgb(0_0_0/0.6)]'}`}
          />
        </span>
      </Seal>
    )
  return (
    <Seal>
      {url && failed !== url ? (
        <img src={url} alt="" aria-hidden="true" referrerPolicy="no-referrer" onError={() => setFailed(url)} className={`${ring} object-cover ${className}`} />
      ) : (
        <span
          aria-hidden="true"
          className={`${ring} grid place-items-center font-display leading-none font-extrabold text-soot-950 uppercase ${className}`}
          style={{ background: PLAYER_STYLE[color ?? colorFor(name)].hex }}
        >
          {name.trim().charAt(0) || '?'}
        </span>
      )}
    </Seal>
  )
}

/** The signed-in player's avatar in the lobby (their seat colour behind the initial). */
export function ProfileAvatar({ profile, className }: { profile: LobbyProfile; className?: string }) {
  return <Avatar name={profile.name} url={profile.avatarUrl} color={profile.color} className={className} />
}
