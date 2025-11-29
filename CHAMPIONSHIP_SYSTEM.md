# Championship-First Match Scraping System

This system provides a **championship-first** approach to fetching ESEA/FACEIT match data. Instead of crawling individual player histories (inefficient and incomplete), it fetches ALL matches from curated championship IDs defined in `championships.yml`.

## Architecture Overview

### Files Created

1. **`championshipConfig.js`** - YAML configuration loader and parser
2. **`championshipFetcher.js`** - API fetcher for championship matches and stats
3. **`championshipDatabase.js`** - In-memory database builder and search interface
4. **`championshipOrchestrator.js`** - Main orchestrator that ties everything together
5. **`championships.yml`** - YAML configuration of championship IDs by division/season

## How It Works

### 1. Configuration Loading (`championshipConfig.js`)

The system loads `championships.yml` which contains championship IDs organized by:
- **Division**: Open, Intermediate, Main, Advanced
- **Season**: 55, 54, 53, 52, 51, 50
- **Region**: East, West (with Central IDs duplicated for coverage)

**Example:**
```yaml
Open:
  Season55:
    East:
      - cf467944-9b2c-4f28-a7e4-d61743b1ace3 # East Reg
      - c4bac4c6-7beb-4293-84e2-d6f1b83bd8f5 # Central
    West:
      - bfddebc6-0ed1-4920-8650-a13da5653ec2 # West Reg
      - c4bac4c6-7beb-4293-84e2-d6f1b83bd8f5 # Central (duplicated)
```

**Deduplication**: The system automatically deduplicates championship IDs (e.g., Central IDs appear in both East and West but are only queried once).

### 2. Data Fetching (`championshipFetcher.js`)

Fetches data from FACEIT Data API v4:

- **Endpoint**: `GET /championships/{championship_id}/matches`
- **Rate Limiting**: 200ms delay between requests
- **Error Handling**: 404s are silently logged (some old championships may not exist)
- **Batch Fetching**: Supports concurrent fetching with configurable concurrency

### 3. Database Building (`championshipDatabase.js`)

Builds an in-memory database with:

**Data Structure:**
```javascript
{
  teams: Map<teamId, {
    teamId: string,
    teamName: string,
    matches: [matchId],
    players: Set<playerId>,
    stats: { wins, losses, totalMatches }
  }>,
  players: Map<playerId, {
    playerId: string,
    playerName: string,
    teams: Set<teamId>,
    matches: [matchId]
  }>,
  matches: [match objects],
  matchStats: Map<matchId, detailed stats>,
  metadata: {
    totalMatches: number,
    totalTeams: number,
    totalPlayers: number,
    dateRange: { earliest: Date, latest: Date },
    championships: [championshipId]
  }
}
```

**Search Functions:**
- `searchTeamsByName(database, searchTerm)` - Partial, case-insensitive search
- `searchPlayersByName(database, searchTerm)` - Partial, case-insensitive search
- `getTeamById(database, teamId)` - Exact ID lookup
- `getPlayerById(database, playerId)` - Exact ID lookup
- `getTeamMatches(database, teamId)` - All matches for a team
- `getPlayerMatches(database, playerId)` - All matches for a player

### 4. Orchestration (`championshipOrchestrator.js`)

Main class that coordinates the entire workflow:

**Workflow:**
1. Load YAML config and extract championship IDs
2. Fetch all matches from championships
3. Optionally fetch detailed match stats
4. Build searchable database
5. Provide save/load functionality (localStorage or file download)

## Usage Examples

### Basic Usage

```javascript
import { ChampionshipOrchestrator } from './championshipOrchestrator.js';
import { searchTeamsByName, getTeamMatches } from './championshipDatabase.js';

// 1. Create orchestrator
const orchestrator = new ChampionshipOrchestrator();

// 2. Set progress callbacks (optional)
orchestrator.setProgressCallbacks({
  onConfigLoad: (division, season) => {
    console.log(`Loading ${division} Season ${season}`);
  },
  onChampionshipFetch: (current, total, championshipId) => {
    console.log(`Fetching championship ${current}/${total}`);
  },
  onComplete: (database) => {
    console.log('Database ready!', database.metadata);
  }
});

// 3. Process championships for a specific division/season
const database = await orchestrator.processChampionships('Open', '55');

// 4. Search for a team
const teams = searchTeamsByName(database, 'Team Liquid');
console.log('Found teams:', teams);

// 5. Get matches for a team
if (teams.length > 0) {
  const matches = getTeamMatches(database, teams[0].teamId);
  console.log('Team matches:', matches);
}

// 6. Save database to localStorage
orchestrator.saveToLocalStorage();
```

### Quick Fetch Function

```javascript
import { fetchChampionshipDatabase } from './championshipOrchestrator.js';
import { searchTeamsByName } from './championshipDatabase.js';

// Quick one-liner to fetch and build database
const database = await fetchChampionshipDatabase(
  'Intermediate',  // division
  '54',            // season
  null,            // API key (optional)
  false,           // fetch detailed stats (slower)
  {
    onComplete: (db) => console.log('Done!', db.metadata)
  }
);

// Search immediately
const teams = searchTeamsByName(database, 'my team name');
```

### Save/Load Database

```javascript
const orchestrator = new ChampionshipOrchestrator();

// Fetch and save
await orchestrator.processChampionships('Open', '55');
orchestrator.saveToLocalStorage('open_s55');

// Later... load from cache
const cached = new ChampionshipOrchestrator();
if (cached.loadFromLocalStorage('open_s55')) {
  const database = cached.getDatabase();
  console.log('Loaded from cache:', database.metadata);
} else {
  console.log('No cache found, fetching...');
  await cached.processChampionships('Open', '55');
}
```

### Download/Upload Database

```javascript
const orchestrator = new ChampionshipOrchestrator();

// Fetch and download
await orchestrator.processChampionships('Main', '55');
orchestrator.downloadDatabase('main_s55_database.json');

// Upload from file
const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  await orchestrator.uploadDatabase(file);
  const database = orchestrator.getDatabase();
  console.log('Uploaded database:', database.metadata);
});
```

### Search Examples

```javascript
import {
  searchTeamsByName,
  searchPlayersByName,
  getTeamMatches,
  getPlayerMatches,
  getMatchStats
} from './championshipDatabase.js';

// Search teams
const teams = searchTeamsByName(database, 'liquid');
// Returns: [{ teamId, teamName, matches: [...], players: [...], stats }]

// Search players
const players = searchPlayersByName(database, 'stewie');
// Returns: [{ playerId, playerName, teams: [...], matches: [...] }]

// Get all matches for a team
const teamMatches = getTeamMatches(database, 'team-uuid-here');

// Get all matches for a player
const playerMatches = getPlayerMatches(database, 'player-uuid-here');

// Get detailed stats for a match (if fetched)
const stats = getMatchStats(database, 'match-uuid-here');
```

## Integration with Existing FACEITTeamCompare.jsx

### Option 1: Pre-fetch Database on App Load

```javascript
import { ChampionshipOrchestrator } from './championshipOrchestrator.js';
import { searchTeamsByName } from './championshipDatabase.js';

// In your app initialization
const [championshipDb, setChampionshipDb] = useState(null);

useEffect(() => {
  async function loadDatabase() {
    const orchestrator = new ChampionshipOrchestrator();

    // Try loading from cache first
    if (orchestrator.loadFromLocalStorage('esea_open_s55')) {
      setChampionshipDb(orchestrator.getDatabase());
    } else {
      // Fetch fresh
      const db = await orchestrator.processChampionships('Open', '55');
      orchestrator.saveToLocalStorage('esea_open_s55');
      setChampionshipDb(db);
    }
  }

  loadDatabase();
}, []);
```

### Option 2: Add Team Search Input

```jsx
function TeamSearchInput({ onTeamSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [database, setDatabase] = useState(null);

  // Load database
  useEffect(() => {
    async function init() {
      const orchestrator = new ChampionshipOrchestrator();
      if (orchestrator.loadFromLocalStorage('esea_db')) {
        setDatabase(orchestrator.getDatabase());
      }
    }
    init();
  }, []);

  // Search as user types
  useEffect(() => {
    if (!database || !searchTerm) {
      setResults([]);
      return;
    }

    const teams = searchTeamsByName(database, searchTerm);
    setResults(teams);
  }, [searchTerm, database]);

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search teams..."
      />
      <ul>
        {results.map(team => (
          <li key={team.teamId} onClick={() => onTeamSelect(team)}>
            {team.teamName} ({team.stats.totalMatches} matches)
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Performance Considerations

### Fetching Speed

- **Basic matches only**: ~5-10 seconds for a single division/season
- **With detailed stats**: Can take several minutes (100+ matches × 200ms each)

### Recommendations

1. **Cache aggressively**: Save to localStorage after first fetch
2. **Fetch basic matches only**: Detailed stats are slow and may not be needed
3. **Pre-fetch common divisions**: Load Open S55 on app initialization
4. **Show progress**: Use progress callbacks to update UI

### Storage

- **Basic database**: ~100-500 KB per division/season
- **With detailed stats**: ~1-5 MB per division/season
- **localStorage limit**: 5-10 MB (browser-dependent)

## API Endpoints Used

All endpoints are from FACEIT Data API v4 (`https://open.faceit.com/data/v4`):

1. `GET /championships/{championship_id}/matches` - List all matches in a championship
2. `GET /matches/{match_id}/stats` - Get detailed stats for a match (optional)

**No API key required** for these endpoints (public data).

## Error Handling

- **404 errors**: Silently logged (some old championships don't exist)
- **Network errors**: Logged and returned as empty arrays
- **Rate limiting**: 200ms delay between requests to avoid hitting limits
- **Invalid config**: Throws descriptive errors for missing divisions/seasons

## Advantages Over Player-Crawling

### Player-Crawling Issues:
- ❌ Incomplete (only finds matches where you know the player)
- ❌ Inefficient (must crawl every player individually)
- ❌ Slow (100 requests per player)
- ❌ Misses roster changes

### Championship-First Benefits:
- ✅ **Complete**: Gets ALL matches from a division/season
- ✅ **Efficient**: Queries entire championships at once
- ✅ **Fast**: ~10-20 requests total for a division/season
- ✅ **Comprehensive**: Captures all teams/players automatically
- ✅ **Searchable**: Build local database for instant lookups

## Next Steps

1. **Test with real data**: Run a fetch for Open S55 and verify results
2. **Integrate with UI**: Add team search input to your app
3. **Add filters**: Filter by date range, map, result, etc.
4. **Add statistics**: Calculate team/player stats from matches
5. **Optimize caching**: Implement cache invalidation strategy

## Troubleshooting

### "Failed to fetch championships.yml"
- Ensure `championships.yml` is in the public directory
- Check that vite.config.js includes YAML files in build

### "No matches found"
- Verify championship IDs in YAML are correct
- Check FACEIT API is accessible
- Some old championships may be empty (expected)

### "LocalStorage quota exceeded"
- Clear old databases: `localStorage.clear()`
- Reduce data by not fetching detailed stats
- Use file download/upload instead

## Example Output

```javascript
{
  metadata: {
    totalMatches: 245,
    totalTeams: 89,
    totalPlayers: 456,
    dateRange: {
      earliest: Date('2024-01-15'),
      latest: Date('2024-05-30')
    },
    championships: ['cf467944...', 'c4bac4c6...', ...]
  }
}
```
