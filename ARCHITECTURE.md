# FACEIT Team Compare - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                    [main.jsx]
                         │
                    ┌────▼────┐
                    │ App.jsx │ ← Main Orchestrator (300 lines)
                    └────┬────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼────┐      ┌────▼────┐     ┌────▼────┐
   │  Hooks  │      │Components│    │ Config  │
   └────┬────┘      └────┬────┘     └────┬────┘
        │                │                │
        │                │                │
   ┌────▼────────┐  ┌────▼─────┐    ┌────▼────────┐
   │  Services   │  │  Utils   │    │  Constants  │
   └─────────────┘  └──────────┘    └─────────────┘
```

## Data Flow

```
User Action
    │
    ▼
┌────────────────────┐
│   App Component    │ Uses custom hooks
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│   Custom Hooks     │ Manages state & side effects
│  - useApiKey       │
│  - useTeamData     │
│  - useTeamSelection│
└────────┬───────────┘
         │
         ├──► ┌──────────────┐
         │    │   Services   │ API calls
         │    └──────────────┘
         │           │
         │           ▼
         │    ┌──────────────┐
         │    │ FACEIT API   │
         │    └──────────────┘
         │
         ▼
┌────────────────────┐
│   Utils            │ Transform & filter data
│  - transformers    │
│  - filters         │
│  - predictor       │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│   Components       │ Render UI
│  - Features        │
│  - UI              │
└────────────────────┘
         │
         ▼
    User sees result
```

## Component Hierarchy

```
App
├── ApiKeyInput (if not verified)
│
└── Main App (if verified)
    ├── Header
    │   ├── Title
    │   └── ViewModeToggle
    │
    ├── TeamSelection
    │   ├── TeamSearch (Team A)
    │   └── TeamSearch (Team B) [Compare mode only]
    │
    ├── Navigation
    │   ├── Overview Tab
    │   ├── Teams Tab
    │   ├── Maps Tab
    │   └── Veto Tab [Compare mode only]
    │
    └── Content (based on active section)
        │
        ├── Overview Section
        │   └── OverviewCard(s)
        │
        ├── Teams Section
        │   └── TeamCard(s)
        │       ├── TeamHeader
        │       ├── TeamRecord
        │       ├── RosterTable
        │       │   ├── Tooltip
        │       │   ├── SkillLevelBadge
        │       │   └── RatingBadge
        │       ├── RecentMatches
        │       │   └── MatchResult
        │       └── MapWinRates
        │           └── WinRateBar
        │
        ├── Maps Section
        │   └── MapStatsDashboard
        │       ├── MapTabs
        │       ├── MapStats
        │       └── MatchLists
        │           └── MatchResult
        │
        └── Veto Section [Compare mode only]
            ├── FormatSelector (BO1/BO3)
            └── VetoPrediction
                ├── PredictionSummary
                ├── HighDiffMaps
                └── PredictedPool
```

## Module Responsibilities

### Layer 1: Configuration
```
config/
└── constants.js
    ├── API endpoints
    ├── Game constants (CS2)
    ├── Map pools
    ├── Storage keys
    └── View modes
```
**Responsibility:** Central source of truth for all app constants

---

### Layer 2: External Services
```
services/
└── faceitApi.js
    └── createFaceitAPI(apiKey)
        ├── verifyApiKey()
        ├── searchTeams()
        ├── getTeam()
        ├── getTeamStats()
        ├── getPlayer()
        ├── getPlayerStats()
        ├── getPlayerHistory()
        ├── getMatchStats()
        └── getMatch()
```
**Responsibility:** All external API communication

---

### Layer 3: Utilities (Pure Functions)
```
utils/
├── transformers.js
│   ├── transformTeamData()      → Convert API data to app format
│   └── transformPlayerStats()   → Convert player data
│
├── vetoPredictor.js
│   └── predictVeto()            → BO1/BO3 veto algorithm
│
├── matchFilters.js
│   ├── filterLast6Months()      → Time filtering
│   ├── isOfficialTeamMatch()    → Pug detection
│   └── formatMatchDate()        → Date formatting
│
└── storage.js
    ├── getStorageItem()         → Read from localStorage
    ├── setStorageItem()         → Write to localStorage
    ├── getApiKey()
    ├── getCachedTeam()
    └── getViewMode()
```
**Responsibility:** Business logic & data transformation

---

### Layer 4: Custom Hooks (State Management)
```
hooks/
├── useApiKey.js
│   ├── State: apiKey, apiKeyStatus, isVerifying
│   ├── Actions: setApiKey, verifyApiKey
│   └── Returns: api instance
│
├── useTeamData.js
│   ├── State: loading, error
│   ├── Actions: fetchTeamData(teamId)
│   └── Returns: transformed team with match history
│
└── useTeamSelection.js
    ├── State: teamA, teamB, viewMode
    ├── Actions: setTeamA, setTeamB, toggleViewMode
    └── Side effects: localStorage persistence
```
**Responsibility:** Encapsulate stateful logic & side effects

---

### Layer 5: UI Components (Presentational)
```
components/ui/
├── Tooltip.jsx           → Hover tooltip
├── Badges.jsx
│   ├── SkillLevelBadge   → Color-coded skill level
│   └── RatingBadge       → Color-coded K/D rating
├── WinRateBar.jsx        → Win rate visualization
├── MatchResult.jsx       → W/L with score
└── LoadingSpinner.jsx    → Loading indicator
```
**Responsibility:** Dumb, reusable UI components

---

### Layer 6: Feature Components (Smart Components)
```
components/features/
├── ApiKeyInput.jsx
│   ├── API key entry
│   ├── Show/hide toggle
│   └── Verification UI
│
├── TeamSearch.jsx
│   ├── Autocomplete input
│   ├── Search API call
│   ├── Result caching (5min)
│   └── Debouncing (300ms)
│
├── TeamCard.jsx
│   ├── Team header & logo
│   ├── Win/Loss record
│   ├── Roster table
│   ├── Recent matches
│   └── Map win rates
│
├── MapStatsDashboard.jsx
│   ├── Map tabs
│   ├── Single/Compare modes
│   ├── Stats grid
│   └── Match lists
│
└── VetoPrediction.jsx
    ├── VetoTimeline
    ├── Prediction summary
    ├── High diff maps
    └── Predicted pool
```
**Responsibility:** Feature-specific logic & composition

---

### Layer 7: Application (Orchestration)
```
App.jsx
├── Compose custom hooks
├── Manage active section
├── Route to correct view
└── Handle user interactions
```
**Responsibility:** Application composition & routing

---

## State Management Strategy

### Local Component State (useState)
- UI-only state (e.g., active tab, dropdown open/close)
- Form inputs

### Custom Hooks (encapsulated state)
- API key management → `useApiKey`
- Team data fetching → `useTeamData`
- Team selection → `useTeamSelection`

### No Global State Library
- **Why?** App is simple enough that prop drilling isn't a problem
- **Custom hooks provide perfect abstraction** for this use case
- **Keep it simple** - Don't add Redux/Zustand unless needed

---

## Performance Optimizations

### Memoization
```javascript
// In App.jsx
const vetoPrediction = useMemo(() => {
  if (viewMode === 'compare' && teamA && teamB) {
    return predictVeto(teamA, teamB, vetoFormat);
  }
  return null;
}, [teamA, teamB, viewMode, vetoFormat]);
```

### Caching Strategy
1. **Search Results** - 5-minute localStorage cache
2. **Team Data** - Persist selected teams across sessions
3. **API Key** - Remember verified key

### Request Throttling
```javascript
// In useTeamData.js
const throttleRequests = async (items, fn, delayMs = 100) => {
  const results = [];
  for (const item of items) {
    results.push(await fn(item));
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return results;
};
```

### Lazy Loading Opportunities
- Dynamic imports for rarely-used components
- Code splitting by route (if adding routing)

---

## Error Handling Strategy

### API Layer (services/faceitApi.js)
```javascript
if (!response.ok) throw new Error('Failed to fetch');
return response.json();
```

### Hook Layer (hooks/useTeamData.js)
```javascript
try {
  const teamData = await fetchTeamData(teamId);
} catch (err) {
  setError(err.message);
  setLoading(false);
  return null;
}
```

### Component Layer (App.jsx)
```javascript
{error && (
  <div className="error-message">
    <strong>Error:</strong> {error}
  </div>
)}
```

### Silent Failures
- 404 on old/deleted matches (expected, don't spam console)
- Graceful degradation for missing data

---

## Testing Strategy (Future)

### Unit Tests (Utils & Services)
```javascript
// utils/vetoPredictor.test.js
test('predicts correct BO3 veto', () => {
  const result = predictVeto(teamA, teamB, 'BO3');
  expect(result.vetoOrder).toHaveLength(7);
});
```

### Hook Tests (React Testing Library)
```javascript
// hooks/useApiKey.test.js
test('verifies valid API key', async () => {
  const { result } = renderHook(() => useApiKey());
  await act(() => result.current.verifyApiKey());
  expect(result.current.apiKeyStatus.valid).toBe(true);
});
```

### Component Tests (Vitest + Testing Library)
```javascript
// components/ui/MatchResult.test.jsx
test('renders win with correct class', () => {
  render(<MatchResult result="W" score="13-7" />);
  expect(screen.getByText('W')).toHaveClass('win');
});
```

### Integration Tests (Playwright/Cypress)
```javascript
test('user can search and select team', async () => {
  await page.fill('[placeholder="Search team name..."]', 'Liquid');
  await page.click('text=Team Liquid');
  expect(await page.textContent('h2')).toContain('Liquid');
});
```

---

## Extensibility

### Adding a New Feature

1. **Create component** in `components/features/`
2. **Add to index.js** for barrel export
3. **Import in App.jsx** and add to appropriate section
4. **If needs state**, create custom hook in `hooks/`
5. **If needs API**, add method to `services/faceitApi.js`
6. **If needs utils**, add to appropriate utils file

### Adding a New Map
1. Update `ALL_MAPS` in `config/constants.js`
2. Update `MAP_DISPLAY_NAMES` in `config/constants.js`
3. Done! Everything else updates automatically

### Adding a New API Endpoint
1. Add method to `services/faceitApi.js`
2. Use in hooks or components
3. Done!

---

## Deployment

### Production Build
```bash
npm run build
# Output: dist/
```

### Environment Variables
- `VITE_API_BASE` - FACEIT API base URL (optional, has defaults)

### Hosting Options
- Vercel (recommended for Vite apps)
- Netlify
- GitHub Pages
- Cloudflare Pages

---

## Conclusion

This architecture follows the **KISS principle** religiously:

- ✅ Each file has **one clear responsibility**
- ✅ **Maximum file size: 300 lines**
- ✅ **No duplicate code** (DRY)
- ✅ **Clear data flow** (top to bottom)
- ✅ **Easy to test** (pure functions + hooks)
- ✅ **Easy to extend** (add features without touching existing code)

**That's how you build maintainable software.**

---

*Architecture designed with the KISS principle by Claude Code*
