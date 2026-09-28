/** Every localStorage key the app writes through lib/storage (kept apart so the legal inventory can import it). */
export const STORAGE_KEYS = {
  gameMode: 'bronze.lobby.gameMode',
  map: 'bronze.lobby.map',
  settings: 'bronze.settings',
  match: 'bronze.match',
  stats: 'bronze.stats',
  /** Seats, names, colours and AI levels from the last new-game setup. */
  setup: 'bronze.setup',
  /** Unsaved calibration from the map board editor. */
  boardDraft: 'bronze.boardDraft',
} as const
