import anchor from '../../assets/icons/anchor.png'
import coal from '../../assets/icons/coal.png'
import iron from '../../assets/icons/iron.png'
import loom from '../../assets/icons/loom.png'
import shipyard from '../../assets/icons/shipyard.png'
import london from '../../assets/hubs/london.png'
import theNorth from '../../assets/hubs/the_north.png'
import westWales from '../../assets/hubs/west_wales.png'
import boat from '../../assets/tokens/art_boat.png'
import locomotive from '../../assets/tokens/art_locomotive.png'

/**
 * The illustrated avatars a player can pick (Settings → Account → Profile):
 * the game's own industry, transport and trade-hub paintings. Saved on the
 * profile as 'preset:<id>'.
 */
export interface PresetAvatar {
  id: string
  src: string
  /** 'cover': a round picture that fills the disc; 'contain': an object on a coloured ground. */
  fit: 'cover' | 'contain'
  /** The disc behind a 'contain' picture. */
  ground?: string
}

export const PRESET_AVATARS: readonly PresetAvatar[] = [
  { id: 'coal-pit', src: coal, fit: 'contain', ground: 'radial-gradient(circle at 35% 30%, #6b7a86, #242b31)' },
  { id: 'ironworks', src: iron, fit: 'contain', ground: 'radial-gradient(circle at 35% 30%, #b86b3c, #3b1d10)' },
  { id: 'cotton-mill', src: loom, fit: 'contain', ground: 'radial-gradient(circle at 35% 30%, #d9c49a, #5a4526)' },
  { id: 'shipyard', src: shipyard, fit: 'contain', ground: 'radial-gradient(circle at 35% 30%, #5f8f96, #1d3437)' },
  { id: 'anchor', src: anchor, fit: 'contain', ground: 'radial-gradient(circle at 35% 30%, #4f6f9a, #17243a)' },
  { id: 'locomotive', src: locomotive, fit: 'contain', ground: 'radial-gradient(circle at 35% 30%, #c79a4a, #3d2a10)' },
  { id: 'narrowboat', src: boat, fit: 'contain', ground: 'radial-gradient(circle at 35% 30%, #7b9a5a, #26331a)' },
  { id: 'london', src: london, fit: 'cover' },
  { id: 'the-north', src: theNorth, fit: 'cover' },
  { id: 'west-wales', src: westWales, fit: 'cover' },
]

export const PRESET_PREFIX = 'preset:'

/** The illustrated avatar a saved value names, if it is one. */
export function presetAvatar(value: string | null | undefined): PresetAvatar | undefined {
  if (!value?.startsWith(PRESET_PREFIX)) return undefined
  const id = value.slice(PRESET_PREFIX.length)
  return PRESET_AVATARS.find((avatar) => avatar.id === id)
}
