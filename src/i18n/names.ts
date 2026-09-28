import type { Messages } from './messages'

/**
 * A seat's name as shown. The default names are stored in English ("You",
 * "Player 2", also inside saved matches and their logs), so they follow the
 * language on screen; a name someone typed is shown as typed.
 */
export function displayName(t: Messages, name: string): string {
  if (name === 'You') return t.common.you
  const player = /^Player (\d+)$/.exec(name)
  return player ? t.common.player(Number(player[1])) : name
}
