# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FACEIT Team Compare is a React single-page application for analyzing CS2 teams on FACEIT. It features team statistics, roster analysis, and detailed map performance tracking.

**Live Application**: https://faceit-compare.netlify.app

## Development Commands

```bash
# Start development server (localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Architecture

### Single-Component Architecture
The entire application is contained in a single React component (`src/FACEITTeamCompare.jsx`, ~3500 lines). This is intentional for this stage of development but is listed as a refactoring goal in the README.

### API Proxy Architecture
The app uses different API proxies depending on the environment:

**Development (localhost)**:
- Vite dev server proxy (`vite.config.js`)
- Routes `/api/*` → `https://open.faceit.com/data/v4/*`
- Proxies Authorization headers from client

**Production (Netlify)**:
- Netlify serverless function (`netlify/functions/api.js`)
- Routes `/.netlify/functions/api?path=<endpoint>` → FACEIT API
- Handles CORS and Authorization header forwarding

The `getApiUrl()` helper function in `FACEITTeamCompare.jsx` automatically selects the correct proxy based on `import.meta.env.DEV`.

### Data Flow

1. **API Key Input**: User provides FACEIT API key via header input
2. **Team Search**: Search by team name using FACEIT search API
3. **Team Data Fetching**:
   - Team details and stats via team API
   - Player details and stats for each roster member
   - Match history from team leader's player history (last 100 matches)
4. **Match Filtering**:
   - Only includes matches from last 6 months
   - Filters by team name to exclude pug/individual matches
   - Fetches detailed match stats for each match
5. **Season Filtering**: User can filter to specific FACEIT seasons (S52-S55)

### State Management
Uses React hooks (no external state management library):
- `useState` for component state
- `useMemo` for computed values
- `useCallback` for memoized callbacks
- `localStorage` for persisting team selections

### Map Stats Processing
Map statistics are built by:
1. Fetching player match history for all team members
2. Deduplicating matches by match_id
3. Fetching detailed stats for each match
4. Filtering to team matches only (not pugs)
5. Extracting round data to calculate per-map statistics

### Known Data Structure

**Map Stats Object**:
```javascript
mapStats[mapName] = {
  wr: parseInt,        // Win rate percentage
  played: number,      // Total matches
  wins: number,
  losses: number,
  rounds: number,
  avgRounds: string,
  matches: [           // Array of match objects
    {
      matchId: string,  // Used for FACEIT room URL
      map: string,
      result: 'W'|'L',
      score: string,    // e.g., "13-7"
      date: string,
      opponent: string
    }
  ]
}
```

## Important Constants

### Map Configuration (FACEITTeamCompare.jsx ~line 312)
```javascript
const ALL_MAPS = ['de_dust2', 'de_mirage', 'de_inferno', 'de_nuke',
                  'de_ancient', 'de_train', 'de_overpass', 'de_anubis', 'de_vertigo'];

const MAP_DISPLAY_NAMES = {
  'de_dust2': 'Dust2',
  'de_mirage': 'Mirage',
  // ... etc
};
```

Maps with no matches are displayed but greyed out and non-expandable.

### API Configuration
- `GAME_ID = 'cs2'` - Used in all API requests
- `FACEIT_API_BASE = 'https://open.faceit.com/data/v4'` - Base URL for FACEIT Data API

## Deployment

### Netlify (Primary)
- Automatic deployments from `main` branch
- Build: `npm run build`
- Publish: `dist/`
- Serverless function handles API proxy

### GitHub Pages (Alternative)
- GitHub Actions workflow in `.github/workflows/deploy.yml`
- Sets `VITE_BASE_PATH=/FACEIT-Compare/` for correct asset paths
- Note: CORS restrictions apply (no serverless proxy available)

## Styling
All CSS is inline in the component using a `<style>` tag with template literals. Uses CSS variables for theming.

## Future Refactoring Goals (from README)
- Extract reusable components from monolithic structure
- Minimize redundant API calls
- Implement proper caching strategies
- Add TypeScript or PropTypes
- Separate business logic from presentation
- Add comprehensive test coverage

## FACEIT API Notes
- Requires API key from https://developers.faceit.com
- Player match history returns last 100 matches maximum
- Match stats endpoint provides detailed round-by-round data
- Team matches have official team_id; pugs use "faction1"/"faction2"
- Some old matches return 404 (handled silently)
