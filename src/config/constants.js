/**
 * Application constants and configuration
 * KISS: All constants in one place, easy to find and modify
 */

// FACEIT API Configuration
export const FACEIT_API_BASE = import.meta.env.DEV
  ? '/api/faceit' // Development: use Vite proxy
  : 'https://open.faceit.com/data/v4'; // Production: direct (requires CORS solution)

export const GAME_ID = 'cs2';

// CS2 Active Duty Map Pool (as of 2025)
export const ALL_MAPS = [
  'de_train',
  'de_dust2',
  'de_mirage',
  'de_overpass',
  'de_inferno',
  'de_nuke'
];

// Map display names for UI
export const MAP_DISPLAY_NAMES = {
  'de_train': 'Train',
  'de_dust2': 'Dust 2',
  'de_mirage': 'Mirage',
  'de_overpass': 'Overpass',
  'de_inferno': 'Inferno',
  'de_nuke': 'Nuke',
  // Legacy maps (for old data compatibility)
  'de_ancient': 'Ancient',
  'de_vertigo': 'Vertigo',
};

// Time filter constants
export const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

// LocalStorage keys
export const STORAGE_KEYS = {
  API_KEY: 'faceit_api_key',
  TEAM_A: 'faceit_team_a',
  TEAM_B: 'faceit_team_b',
  VIEW_MODE: 'faceit_view_mode',
};

// View modes
export const VIEW_MODES = {
  SINGLE: 'single',
  COMPARE: 'compare',
};
