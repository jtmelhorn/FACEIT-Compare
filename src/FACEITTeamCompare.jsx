import React, { useState, useMemo, useCallback, useEffect } from 'react';

// ============================================================================
// FACEIT API CONFIGURATION
// ============================================================================

// Use proxy in development, Netlify function in production
// Development: Vite proxy (/api -> FACEIT API)
// Production: Netlify serverless function (/.netlify/functions/api)
const IS_DEV = import.meta.env.DEV;
const GAME_ID = 'cs2'; // CS2 game ID for FACEIT

// Helper to construct API URL based on environment
const getApiUrl = (path) => {
  if (IS_DEV) {
    // Development: use Vite proxy
    return `/api/${path}`;
  } else {
    // Production: use Netlify function with path as query parameter
    return `/.netlify/functions/api?path=${encodeURIComponent(path)}`;
  }
};

// API Service - In production, replace with your actual API key
// Get your API key from https://developers.faceit.com
const createFaceitAPI = (apiKey) => {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  return {
    // Verify API key by making a lightweight request
    // Uses the /games endpoint which is simple and fast
    verifyApiKey: async () => {
      try {
        const response = await fetch(
          getApiUrl('games?offset=0&limit=1'),
          { headers }
        );
        if (response.status === 401) {
          return { valid: false, error: 'Invalid API key' };
        }
        if (response.status === 403) {
          return { valid: false, error: 'API key lacks required permissions' };
        }
        if (!response.ok) {
          return { valid: false, error: `API error: ${response.status}` };
        }
        return { valid: true, error: null };
      } catch (err) {
        return { valid: false, error: 'Network error - could not reach FACEIT API' };
      }
    },

    // Search for teams by name
    searchTeams: async (nickname, limit = 20) => {
      const response = await fetch(
        getApiUrl(`search/teams?nickname=${encodeURIComponent(nickname)}&game=${GAME_ID}&limit=${limit}`),
        { headers }
      );
      if (!response.ok) throw new Error('Failed to search teams');
      return response.json();
    },

    // Get team details
    getTeam: async (teamId) => {
      const response = await fetch(
        getApiUrl(`teams/${teamId}`),
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get team');
      return response.json();
    },

    // Get team statistics
    getTeamStats: async (teamId) => {
      const response = await fetch(
        getApiUrl(`teams/${teamId}/stats/${GAME_ID}`),
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get team stats');
      return response.json();
    },

    // Get player details
    getPlayer: async (playerId) => {
      const response = await fetch(
        getApiUrl(`players/${playerId}`),
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get player');
      return response.json();
    },

    // Get player statistics
    getPlayerStats: async (playerId) => {
      const response = await fetch(
        getApiUrl(`players/${playerId}/stats/${GAME_ID}`),
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get player stats');
      return response.json();
    },

    // Get player match history
    getPlayerHistory: async (playerId, limit = 20) => {
      const response = await fetch(
        getApiUrl(`players/${playerId}/history?game=${GAME_ID}&limit=${limit}`),
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get player history');
      return response.json();
    },

    // Get match statistics
    getMatchStats: async (matchId) => {
      const response = await fetch(
        getApiUrl(`matches/${matchId}/stats`),
        { headers }
      );
      if (!response.ok) {
        const error = new Error(`Failed to get match stats (${response.status})`);
        error.status = response.status;
        throw error;
      }
      return response.json();
    },

    // Search for players
    searchPlayers: async (nickname, limit = 20) => {
      const response = await fetch(
        getApiUrl(`search/players?nickname=${encodeURIComponent(nickname)}&game=${GAME_ID}&limit=${limit}`),
        { headers }
      );
      if (!response.ok) throw new Error('Failed to search players');
      return response.json();
    },

    // Get hub details (for league/division info)
    getHub: async (hubId) => {
      const response = await fetch(
        getApiUrl(`hubs/${hubId}`),
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get hub');
      return response.json();
    },

    // Get hub stats/leaderboard
    getHubStats: async (hubId, limit = 100) => {
      const response = await fetch(
        getApiUrl(`hubs/${hubId}/stats?limit=${limit}`),
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get hub stats');
      return response.json();
    },

    // Search for hubs (leagues) - Note: FACEIT API doesn't have direct hub search
    // Popular hubs need to be known by ID (e.g., ECL, FPL, etc.)
    getPopularHubs: async () => {
      // This would need to fetch known hub IDs or use organizer search
      // For now, return a predefined list of popular CS2 league hub IDs
      return {
        items: [
          { hub_id: 'faceit-pro-league', name: 'FACEIT Pro League', game: 'cs2', organizer_name: 'FACEIT' },
          { hub_id: 'ecl', name: 'ECL', game: 'cs2', organizer_name: 'ECL' },
          // More would be added based on known hub IDs
        ]
      };
    },

    // Get teams/members in a hub
    getHubMembers: async (hubId, offset = 0, limit = 100) => {
      const response = await fetch(
        getApiUrl(`hubs/${hubId}/members?offset=${offset}&limit=${limit}`),
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get hub members');
      return response.json();
    },

    // Get league by ID
    getLeague: async (leagueId) => {
      const response = await fetch(
        getApiUrl(`leagues/${leagueId}`),
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get league');
      return response.json();
    },

    // Get league season details
    getLeagueSeason: async (leagueId, seasonId) => {
      // Try getting the league first, which should contain seasons
      const leagueUrl = getApiUrl(`leagues/${leagueId}`);
      console.log('Fetching league from:', leagueUrl);
      const leagueResponse = await fetch(leagueUrl, { headers });
      console.log('League response status:', leagueResponse.status);

      if (!leagueResponse.ok) {
        const errorText = await leagueResponse.text();
        console.error('League error response:', errorText);
        throw new Error(`Failed to get league (${leagueResponse.status}): ${errorText}`);
      }

      const leagueData = await leagueResponse.json();
      console.log('League data:', leagueData);

      // Find the specific season in the league data
      if (leagueData.seasons && Array.isArray(leagueData.seasons)) {
        const season = leagueData.seasons.find(s => s.season_id === seasonId);
        if (season) {
          console.log('Found season in league data:', season);
          return season;
        }
      }

      // If season not found in league data, try the direct season endpoint
      const seasonUrl = getApiUrl(`leagues/${leagueId}/seasons/${seasonId}`);
      console.log('Trying season endpoint:', seasonUrl);
      const seasonResponse = await fetch(seasonUrl, { headers });
      console.log('Season response status:', seasonResponse.status);

      if (!seasonResponse.ok) {
        const errorText = await seasonResponse.text();
        console.error('Season error response:', errorText);
        throw new Error(`Failed to get league season (${seasonResponse.status}): ${errorText}`);
      }

      return seasonResponse.json();
    },

    // Get leaderboard by ID
    getLeaderboard: async (leaderboardId, offset = 0, limit = 100) => {
      const response = await fetch(
        getApiUrl(`leaderboards/${leaderboardId}?offset=${offset}&limit=${limit}`),
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get leaderboard');
      return response.json();
    },

    // Get teams in a league season by first fetching season details to get leaderboard IDs
    getLeagueSeasonRoster: async (leagueId, seasonId, offset = 0, limit = 100) => {
      // First get the season details which contains leaderboard IDs in divisions
      const seasonData = await this.getLeagueSeason(leagueId, seasonId);

      // Extract leaderboard IDs from divisions
      const leaderboardIds = [];
      if (seasonData.divisions && Array.isArray(seasonData.divisions)) {
        seasonData.divisions.forEach(division => {
          if (division.leaderboards && Array.isArray(division.leaderboards)) {
            leaderboardIds.push(...division.leaderboards);
          }
        });
      }

      // If no leaderboards found, return empty result
      if (leaderboardIds.length === 0) {
        return { items: [] };
      }

      // Fetch data from all leaderboards and combine
      const allItems = [];
      for (const leaderboardId of leaderboardIds) {
        try {
          const leaderboardData = await this.getLeaderboard(leaderboardId, offset, limit);
          if (leaderboardData.items) {
            allItems.push(...leaderboardData.items);
          }
        } catch (err) {
          console.warn(`Failed to fetch leaderboard ${leaderboardId}:`, err);
        }
      }

      return { items: allItems };
    },

    // Get championships (tournaments - different from leagues)
    getChampionships: async (offset = 0, limit = 20) => {
      const response = await fetch(
        getApiUrl(`championships?game=${GAME_ID}&offset=${offset}&limit=${limit}`),
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get championships');
      return response.json();
    },

    // Get championship details
    getChampionship: async (championshipId) => {
      const response = await fetch(
        getApiUrl(`championships/${championshipId}`),
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get championship');
      return response.json();
    },

    // Get teams in a championship
    getChampionshipTeams: async (championshipId, offset = 0, limit = 50) => {
      const response = await fetch(
        getApiUrl(`championships/${championshipId}/subscriptions?offset=${offset}&limit=${limit}`),
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get championship teams');
      return response.json();
    },

    // Get match details
    getMatch: async (matchId) => {
      const response = await fetch(
        getApiUrl(`matches/${matchId}`),
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get match');
      return response.json();
    },
  };
};

// ============================================================================
// DATA TRANSFORMATION UTILITIES
// ============================================================================

// Current CS2 Active Duty Map Pool (as of 2025)
const ALL_MAPS = ['de_train', 'de_dust2', 'de_mirage', 'de_ancient', 'de_anubis', 'de_inferno', 'de_nuke'];
const MAP_DISPLAY_NAMES = {
  'de_train': 'Train',
  'de_dust2': 'Dust2',  // Changed from "Dust 2" to "Dust2" to match API
  'de_mirage': 'Mirage',
  'de_ancient': 'Ancient',
  'de_anubis': 'Anubis',
  'de_inferno': 'Inferno',
  'de_nuke': 'Nuke',
  // Legacy maps (for old data compatibility)
  'de_overpass': 'Overpass',
  'de_vertigo': 'Vertigo',
};

// Normalize map names from API (handles both "Dust2" and "Dust 2")
const normalizeMapName = (name) => {
  // Handle common variations
  const normalized = name.replace(/\s+/g, '').toLowerCase();

  // Map normalized names back to our display names
  const nameMap = {
    'dust2': 'Dust2',
    'train': 'Train',
    'mirage': 'Mirage',
    'ancient': 'Ancient',
    'anubis': 'Anubis',
    'inferno': 'Inferno',
    'nuke': 'Nuke',
    'overpass': 'Overpass',
    'vertigo': 'Vertigo',
  };

  return nameMap[normalized] || name;
};

// Transform FACEIT API data to our app format
const transformTeamData = (teamDetails, teamStats, memberStats) => {
  const lifetime = teamStats?.lifetime || {};
  const segments = teamStats?.segments || [];

  // Extract map stats from segments
  const mapStats = {};
  segments.forEach(segment => {
    if (segment.type === 'Map' && segment.mode === '5v5') {
      const mapName = normalizeMapName(segment.label);
      const stats = segment.stats || {};
      const wins = parseInt(stats['Wins'] || 0);
      const matches = parseInt(stats['Matches'] || 0);
      const losses = matches - wins;

      mapStats[mapName] = {
        wr: parseInt(stats['Win Rate %'] || 0),
        played: matches,
        wins: wins,
        losses: losses,
        rounds: parseInt(stats['Rounds'] || 0),
        avgRounds: matches > 0 ? (parseInt(stats['Rounds'] || 0) / matches).toFixed(1) : '0.0',
        matches: [], // Will be populated with match details
      };
    }
  });

  // Calculate roster stats
  const roster = (teamDetails.members || []).map((member, idx) => {
    const playerStats = memberStats[member.user_id] || {};
    const playerLifetime = playerStats.lifetime || {};

    return {
      id: member.user_id,
      name: member.nickname,
      country: member.country,
      skillLevel: member.skill_level || 0,
      role: idx === 0 ? 'Leader' : 'Member',
      rating: parseFloat(playerLifetime['Average K/D Ratio'] || 1.0),
      hs: parseInt(playerLifetime['Average Headshots %'] || 0),
      kpr: parseFloat(playerLifetime['Average K/R Ratio'] || 0.7),
      wins: parseInt(playerLifetime['Wins'] || 0),
      matches: parseInt(playerLifetime['Matches'] || 0),
      winRate: parseInt(playerLifetime['Win Rate %'] || 50),
    };
  });

  return {
    id: teamDetails.team_id,
    name: teamDetails.name,
    tag: teamDetails.nickname,
    avatar: teamDetails.avatar,
    game: teamDetails.game,
    leader: teamDetails.leader,
    record: {
      wins: parseInt(lifetime['Wins'] || 0),
      losses: parseInt(lifetime['Matches'] || 0) - parseInt(lifetime['Wins'] || 0),
      matches: parseInt(lifetime['Matches'] || 0),
      winRate: parseInt(lifetime['Win Rate %'] || 50),
    },
    roster,
    mapStats,
    recentMatches: [], // Populated separately from match history
    vetoPatterns: {
      firstBans: {}, // Map name -> count of times banned first
      firstPicks: {}, // Map name -> count of times picked first
    },
  };
};

// Transform player stats for detailed view
const transformPlayerStats = (playerData, statsData) => {
  const lifetime = statsData?.lifetime || {};
  const segments = statsData?.segments || [];

  const mapStats = {};
  segments.forEach(segment => {
    if (segment.type === 'Map') {
      mapStats[segment.label] = {
        matches: parseInt(segment.stats?.['Matches'] || 0),
        winRate: parseInt(segment.stats?.['Win Rate %'] || 0),
        kd: parseFloat(segment.stats?.['Average K/D Ratio'] || 1.0),
        hs: parseInt(segment.stats?.['Average Headshots %'] || 0),
      };
    }
  });

  return {
    id: playerData.player_id,
    nickname: playerData.nickname,
    avatar: playerData.avatar,
    country: playerData.country,
    elo: playerData.games?.[GAME_ID]?.faceit_elo || 0,
    skillLevel: playerData.games?.[GAME_ID]?.skill_level || 0,
    lifetime: {
      matches: parseInt(lifetime['Matches'] || 0),
      wins: parseInt(lifetime['Wins'] || 0),
      winRate: parseInt(lifetime['Win Rate %'] || 0),
      kd: parseFloat(lifetime['Average K/D Ratio'] || 1.0),
      hs: parseInt(lifetime['Average Headshots %'] || 0),
      kpr: parseFloat(lifetime['Average K/R Ratio'] || 0.7),
    },
    mapStats,
  };
};

// ============================================================================
// SAMPLE DATA (Used when API key not provided)
// ============================================================================

const SAMPLE_TEAMS = {};

// ============================================================================
// COMPONENTS
// ============================================================================

const Tooltip = ({ children, content }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="tooltip-wrapper" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && <div className="tooltip-content">{content}</div>}
    </div>
  );
};

const SkillLevelBadge = ({ level }) => {
  const getColor = (l) => {
    if (l >= 9) return 'skill-elite';
    if (l >= 7) return 'skill-high';
    if (l >= 5) return 'skill-mid';
    if (l >= 3) return 'skill-low';
    return 'skill-new';
  };
  return <span className={`skill-badge ${getColor(level)}`}>Lvl {level}</span>;
};

const RatingBadge = ({ rating }) => {
  const getColor = (r) => {
    if (r >= 1.20) return 'rating-elite';
    if (r >= 1.10) return 'rating-high';
    if (r >= 1.00) return 'rating-good';
    if (r >= 0.90) return 'rating-avg';
    return 'rating-low';
  };
  return <span className={`rating-badge ${getColor(rating)}`}>{rating.toFixed(2)}</span>;
};

const WinRateBar = ({ wr, label, teamColor, wins, losses, played }) => (
  <div className="wr-bar-container">
    <div className="wr-bar-label">{label}</div>
    <div className="wr-bar-track">
      <div className={`wr-bar-fill ${teamColor}`} style={{ width: `${wr}%` }} />
    </div>
    <div className="wr-bar-stats">
      <span className="wr-record">{wins}W - {losses}L</span>
      <span className="wr-value">{wr}%</span>
    </div>
  </div>
);

const MatchResult = ({ result, score }) => (
  <div className={`match-result ${result === 'W' ? 'win' : 'loss'}`}>
    <span className="result-letter">{result}</span>
    <span className="result-score">{score}</span>
  </div>
);

const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <span>Loading...</span>
  </div>
);

// Team Search Component
const TeamSearch = ({ label, onSelect, selectedTeam, excludeId, api }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = useCallback(async (searchQuery) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);

    try {
      if (api) {
        // Regular search across all teams
        const response = await api.searchTeams(searchQuery, 20);
        const teams = response.items || [];
        setResults(teams.map(team => ({
          id: team.team_id,
          name: team.name,
          tag: team.nickname,
          avatar: team.avatar,
        })));
      } else {
        // In demo mode, filter sample teams
        const filtered = Object.values(SAMPLE_TEAMS).filter(
          t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.tag.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setResults(filtered);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    }

    setIsSearching(false);
  }, [api]);

  useEffect(() => {
    const timeout = setTimeout(() => handleSearch(query), 300);
    return () => clearTimeout(timeout);
  }, [query, handleSearch]);

  return (
    <div className="team-search">
      <label>{label}</label>
      <div className="search-input-wrapper">
        <input
          type="text"
          placeholder="Search team name..."
          value={selectedTeam ? selectedTeam.name : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
            if (selectedTeam) onSelect(null);
          }}
          onFocus={() => setShowDropdown(true)}
        />
        {selectedTeam && (
          <button className="clear-btn" onClick={() => { onSelect(null); setQuery(''); }}>×</button>
        )}
      </div>
      {showDropdown && !selectedTeam && (
        <div className="search-dropdown">
          {isSearching ? (
            <div className="search-loading">Searching...</div>
          ) : results.length > 0 ? (
            results.filter(t => t.id !== excludeId).map(team => (
              <div
                key={team.id}
                className="search-result"
                onClick={() => { onSelect(team); setShowDropdown(false); }}
              >
                <span className="result-name">{team.name}</span>
                <span className="result-tag">[{team.tag}]</span>
              </div>
            ))
          ) : query.length >= 2 ? (
            <div className="no-results">No teams found</div>
          ) : (
            <div className="search-hint">Type at least 2 characters</div>
          )}
        </div>
      )}
    </div>
  );
};

// Team Card Component
const TeamCard = ({ team, side }) => {
  const avgRating = team.roster.length > 0
    ? (team.roster.reduce((sum, p) => sum + p.rating, 0) / team.roster.length).toFixed(2)
    : '1.00';

  return (
    <div className={`team-card ${side}`}>
      <div className="team-header">
        <div className="team-logo">
          {team.avatar ? <img src={team.avatar} alt={team.name} /> : '🎮'}
        </div>
        <div className="team-info">
          <h2>{team.name}</h2>
          <span className="team-tag">[{team.tag}]</span>
          <a
            href={`https://www.faceit.com/en/teams/${team.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="faceit-link"
          >
            View on FACEIT ↗
          </a>
        </div>
      </div>

      <div className="team-record">
        <div className="record-item wins">
          <span className="record-num">{team.record.wins}</span>
          <span className="record-label">Wins</span>
        </div>
        <div className="record-divider">-</div>
        <div className="record-item losses">
          <span className="record-num">{team.record.losses}</span>
          <span className="record-label">Losses</span>
        </div>
        <div className="record-wr">{team.record.winRate}% WR</div>
      </div>

      <div className="section-title">Roster</div>
      <div className="roster-table">
        <div className="roster-header">
          <span>Player</span>
          <span>Level</span>
          <span>K/D</span>
          <span>HS%</span>
          <span>Win%</span>
        </div>
        {team.roster.map((player) => (
          <Tooltip
            key={player.id}
            content={
              <div className="player-tooltip">
                <div>Matches: {player.matches}</div>
                <div>Wins: {player.wins}</div>
                <div>K/R: {player.kpr}</div>
              </div>
            }
          >
            <div className="roster-row">
              <span className="player-name">
                {player.name}
                {player.role === 'Leader' && <span className="leader-badge">★</span>}
              </span>
              <span><SkillLevelBadge level={player.skillLevel} /></span>
              <span><RatingBadge rating={player.rating} /></span>
              <span>{player.hs}%</span>
              <span>{player.winRate}%</span>
            </div>
          </Tooltip>
        ))}
        <div className="roster-avg">
          <span>Team Average</span>
          <span></span>
          <span><RatingBadge rating={parseFloat(avgRating)} /></span>
          <span>{Math.round(team.roster.reduce((s, p) => s + p.hs, 0) / team.roster.length)}%</span>
          <span>{Math.round(team.roster.reduce((s, p) => s + p.winRate, 0) / team.roster.length)}%</span>
        </div>
      </div>

      {team.recentMatches && team.recentMatches.length > 0 && (
        <>
          <div className="section-title">Recent Matches</div>
          <div className="recent-matches">
            {team.recentMatches.slice(0, 5).map((match, idx) => (
              <div key={idx} className="match-row">
                <MatchResult result={match.result} score={match.score} />
                <span className="match-opponent">vs {match.opponent}</span>
                <span className="match-date">{match.date}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};





// Map Overview Panel Component
const MapOverviewPanel = ({ teamA }) => {
  // Calculate map statistics
  const calculateMapStats = (mapStats) => {
    const maps = Object.entries(mapStats).filter(([_, data]) => data.played > 0);
    if (maps.length === 0) return null;

    const sortedByPlayed = [...maps].sort((a, b) => b[1].played - a[1].played);
    const sortedByWR = [...maps].sort((a, b) => b[1].wr - a[1].wr);

    return {
      mostPlayed: { name: sortedByPlayed[0][0], count: sortedByPlayed[0][1].played },
      leastPlayed: { name: sortedByPlayed[sortedByPlayed.length - 1][0], count: sortedByPlayed[sortedByPlayed.length - 1][1].played },
      highestWR: { name: sortedByWR[0][0], wr: sortedByWR[0][1].wr, played: sortedByWR[0][1].played },
      lowestWR: { name: sortedByWR[sortedByWR.length - 1][0], wr: sortedByWR[sortedByWR.length - 1][1].wr, played: sortedByWR[sortedByWR.length - 1][1].played }
    };
  };

  const statsA = calculateMapStats(teamA.mapStats);

  return (
    <div className="map-overview-section">
      <h3>Map Win Rates (Current Pool)</h3>
      <div className="map-overview-grid">
        {statsA && (
          <>
            <div className="overview-card">
              <span className="overview-label">Most Played</span>
              <span className="overview-value">{statsA.mostPlayed.name}</span>
              <span className="overview-subtext">{statsA.mostPlayed.count} matches</span>
            </div>
            <div className="overview-card">
              <span className="overview-label">Least Played</span>
              <span className="overview-value">{statsA.leastPlayed.name}</span>
              <span className="overview-subtext">{statsA.leastPlayed.count} matches</span>
            </div>
            <div className="overview-card highlight-positive">
              <span className="overview-label">Highest Win Rate</span>
              <span className="overview-value">{statsA.highestWR.name}</span>
              <span className="overview-subtext">{statsA.highestWR.wr}% ({statsA.highestWR.played} played)</span>
            </div>
            <div className="overview-card highlight-negative">
              <span className="overview-label">Lowest Win Rate</span>
              <span className="overview-value">{statsA.lowestWR.name}</span>
              <span className="overview-subtext">{statsA.lowestWR.wr}% ({statsA.lowestWR.played} played)</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Map Stats Dashboard
const MapStatsDashboard = ({ teamA }) => {
  const [expandedMap, setExpandedMap] = useState(null);

  // Get all map entries for displaying win/loss bars
  // mapName in mapStats is the display name like "Dust 2", check if it exists in MAP_DISPLAY_NAMES values
  const currentPoolDisplayNames = ALL_MAPS.map(mapKey => MAP_DISPLAY_NAMES[mapKey]);

  const mapEntriesA = Object.entries(teamA.mapStats || {})
    .filter(([mapName]) => currentPoolDisplayNames.includes(mapName));

  const toggleMap = (mapName) => {
    setExpandedMap(expandedMap === mapName ? null : mapName);
  };

  return (
    <div className="map-stats-dashboard">
      {/* Map Win Rates Bar Graph Section */}
      <div className="map-winrates-section">
        <h3>Map Win Rates (Current Pool)</h3>
        <div className="map-wr-list">
          {mapEntriesA.length > 0 ? mapEntriesA.map(([mapName, stats]) => (
            <div key={mapName} className="map-wr-item">
              <div className="map-wr-clickable" onClick={() => toggleMap(mapName)}>
                <WinRateBar
                  wr={stats.wr || 0}
                  label={mapName}
                  teamColor="team-a"
                  wins={stats.wins || 0}
                  losses={stats.losses || 0}
                  played={stats.played || 0}
                />
                <span className={`expand-icon ${expandedMap === mapName ? 'expanded' : ''}`}>
                  {expandedMap === mapName ? '▼' : '▶'}
                </span>
              </div>
              {expandedMap === mapName && (
                <div className="map-matches-expanded">
                  <h4>Matches on {mapName}</h4>
                  {stats.matches && stats.matches.length > 0 ? (
                    <div className="match-list">
                      {stats.matches.map((match, idx) => (
                        <div key={idx} className="match-item">
                          <MatchResult result={match.result} score={match.score} />
                          <span className="match-opponent">vs {match.opponent}</span>
                          <span className="match-date">{match.date}</span>
                          <a
                            href={`https://www.faceit.com/en/cs2/room/${match.originalMatchId || match.matchId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="match-link"
                          >
                            View Match ↗
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-matches">No match data available</p>
                  )}
                </div>
              )}
            </div>
          )) : (
            <div className="no-data">No map data available</div>
          )}
        </div>
      </div>
    </div>
  );
};

// API Key Input Component
const ApiKeyInput = ({ apiKey, setApiKey, onVerify, verificationStatus }) => {
  const [showKey, setShowKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!apiKey.trim()) return;
    setIsVerifying(true);
    await onVerify(apiKey);
    setIsVerifying(false);
  };

  // Don't render if API key is verified
  if (verificationStatus === 'valid') {
    return null;
  }

  return (
    <div className="api-key-section">
      <div className="api-key-header">
        <span className="api-icon">🔑</span>
        <span>FACEIT API Key</span>
        {verificationStatus === 'invalid' && <span className="status-badge invalid">✗ Invalid</span>}
      </div>
      <div className="api-key-input-wrapper">
        <input
          type={showKey ? 'text' : 'password'}
          placeholder="Enter your FACEIT API key..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && apiKey.trim()) {
              handleVerify();
            }
          }}
        />
        <button
          className="toggle-visibility"
          onClick={() => setShowKey(!showKey)}
          title={showKey ? 'Hide key' : 'Show key'}
        >
          {showKey ? '👁️' : '👁️‍🗨️'}
        </button>
        <button
          className="verify-btn"
          onClick={handleVerify}
          disabled={!apiKey.trim() || isVerifying}
          title="Verify API key"
        >
          {isVerifying ? (
            <span className="mini-spinner"></span>
          ) : (
            '✓ Verify'
          )}
        </button>
      </div>
      <div className="api-key-help">
        Get your API key from{' '}
        <a href="https://developers.faceit.com" target="_blank" rel="noopener noreferrer">
          developers.faceit.com
        </a>
        {' '}→ App Studio → Create App → API Keys
      </div>
      {!apiKey && (
        <div className="demo-mode-notice">
          <span className="demo-icon">ℹ️</span>
          Running in demo mode with sample data
        </div>
      )}
      {verificationStatus === 'invalid' && (
        <div className="error-notice">
          <span className="error-icon">⚠️</span>
          API key verification failed. Please check your key.
        </div>
      )}
    </div>
  );
};


// Veto Stats Component
const VetoStats = ({ teamA, teamB }) => {
  const getVetoStats = (team) => {
    if (!team || !team.vetoStats) {
      console.log('No veto stats found for team:', team?.name);
      return null;
    }

    const { bans, picks, totalVetos } = team.vetoStats;
    console.log('Veto data for', team.name, ':', { bans, picks, totalVetos });

    // Check if we have any data
    const hasBans = bans && Object.keys(bans).length > 0;
    const hasPicks = picks && Object.keys(picks).length > 0;

    if (!hasBans && !hasPicks) {
      console.log('No bans or picks found for team:', team.name);
      return null;
    }

    const sortedBans = hasBans ? Object.entries(bans).sort((a, b) => b[1] - a[1]) : [];
    const sortedPicks = hasPicks ? Object.entries(picks).sort((a, b) => b[1] - a[1]) : [];

    return {
      mostVetoed: sortedBans[0] ? { map: sortedBans[0][0], count: sortedBans[0][1] } : null,
      leastVetoed: sortedBans[sortedBans.length - 1] ? { map: sortedBans[sortedBans.length - 1][0], count: sortedBans[sortedBans.length - 1][1] } : null,
      mostPicked: sortedPicks[0] ? { map: sortedPicks[0][0], count: sortedPicks[0][1] } : null,
      totalVetos,
      allBans: sortedBans,
      allPicks: sortedPicks
    };
  };

  const statsA = getVetoStats(teamA);
  const statsB = teamB ? getVetoStats(teamB) : null;

  const renderTeamStats = (stats, teamName) => {
    if (!stats) {
      return (
        <div className="no-data">
          <p>No veto data available for {teamName}</p>
          <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
            Veto data is only available for matches that include pick/ban information
          </p>
        </div>
      );
    }

    return (
      <div className="veto-stats-card">
        <h4>{teamName} Veto Stats</h4>
        <div className="stat-grid">
          <div className="stat-item ban">
            <span className="stat-label">Most Vetoed Map</span>
            <span className="stat-value">{stats.mostVetoed ? stats.mostVetoed.map : 'N/A'}</span>
            <span className="stat-count">{stats.mostVetoed ? `${stats.mostVetoed.count} bans` : ''}</span>
          </div>
          <div className="stat-item pick">
            <span className="stat-label">Most Picked Map</span>
            <span className="stat-value">{stats.mostPicked ? stats.mostPicked.map : 'N/A'}</span>
            <span className="stat-count">{stats.mostPicked ? `${stats.mostPicked.count} picks` : ''}</span>
          </div>
          <div className="stat-item info">
            <span className="stat-label">Total Recorded Vetos</span>
            <span className="stat-value">{stats.totalVetos}</span>
          </div>
        </div>

        {/* Show all bans and picks */}
        <div className="veto-details">
          {stats.allBans.length > 0 && (
            <div className="veto-list">
              <h5>Map Bans</h5>
              {stats.allBans.map(([map, count]) => (
                <div key={map} className="veto-list-item">
                  <span className="map-name">{map}</span>
                  <span className="count">{count} times</span>
                </div>
              ))}
            </div>
          )}

          {stats.allPicks.length > 0 && (
            <div className="veto-list">
              <h5>Map Picks</h5>
              {stats.allPicks.map(([map, count]) => (
                <div key={map} className="veto-list-item">
                  <span className="map-name">{map}</span>
                  <span className="count">{count} times</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="veto-stats-container">
      <div className="veto-stats-wrapper">
        {renderTeamStats(statsA, teamA.name)}
        {teamB && <div className="vs-divider">VS</div>}
        {teamB && renderTeamStats(statsB, teamB.name)}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function FACEITTeamCompare() {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState(null); // null, 'valid', 'invalid'
  const [teamA, setTeamA] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState('S55'); // Season filter
  const [headerCollapsed, setHeaderCollapsed] = useState(false); // Collapsible header
  const [activeSection, setActiveSection] = useState('compare'); // Active tab section

  // Load cached teams from localStorage on mount
  // Load cached teams from localStorage on mount
  useEffect(() => {
    try {
      const cachedTeamA = localStorage.getItem('faceit_team_a');

      if (cachedTeamA) {
        setTeamA(JSON.parse(cachedTeamA));
      }
    } catch (err) {
      console.warn('Failed to load cached teams:', err);
    }
  }, []);

  // Cache teams to localStorage when they change
  useEffect(() => {
    if (teamA) {
      localStorage.setItem('faceit_team_a', JSON.stringify(teamA));
    } else {
      localStorage.removeItem('faceit_team_a');
    }
  }, [teamA]);



  // Verify API key
  const handleVerifyApiKey = useCallback(async (key) => {
    const tempApi = createFaceitAPI(key);
    const result = await tempApi.verifyApiKey();
    setApiKeyStatus(result.valid ? 'valid' : 'invalid');
    if (!result.valid) {
      setError(result.error);
      localStorage.removeItem('faceit_api_key');
    } else {
      setError(null);
      // Save valid API key to localStorage
      localStorage.setItem('faceit_api_key', key);
    }
  }, []);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('faceit_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      // Auto-verify saved key
      handleVerifyApiKey(savedKey);
    }
  }, [handleVerifyApiKey]);

  // Create API instance when key changes
  const api = useMemo(() => {
    if (apiKey && apiKeyStatus === 'valid') {
      return createFaceitAPI(apiKey);
    }
    return null;
  }, [apiKey, apiKeyStatus]);

  // Reset status when key changes
  useEffect(() => {
    if (apiKey === '') {
      setApiKeyStatus(null);
      localStorage.removeItem('faceit_api_key');
    }
  }, [apiKey]);

  // Handle team selection and fetch full team data
  const handleTeamSelect = useCallback(async (team, setTeam) => {
    if (!team) {
      setTeam(null);
      return;
    }

    // If team is from sample data or already has full data, just set it
    if (team.roster && team.mapStats && team.vetoStats) {
      setTeam(team);
      return;
    }

    // Fetch full team data from API
    if (!api) {
      setTeam(team);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const teamDetails = await api.getTeam(team.id);
      const teamStats = await api.getTeamStats(team.id);

      // Fetch stats for all team members
      const memberStatsPromises = teamDetails.members.map(member =>
        api.getPlayerStats(member.user_id).catch(() => ({}))
      );

      // Fetch player details for all team members (to get skill level/ELO)
      const memberDetailsPromises = teamDetails.members.map(member =>
        api.getPlayer(member.user_id).catch(() => ({}))
      );

      const [memberStatsArray, memberDetailsArray] = await Promise.all([
        Promise.all(memberStatsPromises),
        Promise.all(memberDetailsPromises)
      ]);

      const memberStats = {};
      teamDetails.members.forEach((member, idx) => {
        memberStats[member.user_id] = memberStatsArray[idx];

        // Merge detailed player info (skill level, elo) into the member object
        const details = memberDetailsArray[idx];
        if (details && details.games && details.games[GAME_ID]) {
          member.skill_level = details.games[GAME_ID].skill_level;
          member.faceit_elo = details.games[GAME_ID].faceit_elo;
        }
      });

      const fullTeamData = transformTeamData(teamDetails, teamStats, memberStats);

      // Initialize veto stats
      fullTeamData.vetoStats = {
        bans: {},
        picks: {},
        totalVetos: 0
      };

      // Fetch match history from ALL team members to get comprehensive match data
      try {
        const allMatchIds = new Set(); // Track unique match IDs

        // Fetch match history for each team member
        const memberHistoryPromises = teamDetails.members.map(async (member) => {
          try {
            const matchHistory = await api.getPlayerHistory(member.user_id, 100);
            console.log(`Fetched ${matchHistory.items?.length || 0} matches for member ${member.nickname || member.user_id}`);
            return matchHistory.items || [];
          } catch (err) {
            console.warn(`Failed to fetch history for member ${member.user_id}:`, err);
            return [];
          }
        });

        const allMemberHistories = await Promise.all(memberHistoryPromises);

        // Combine and deduplicate matches from all members (no time filter, we'll filter by season)
        const seenMatches = new Set();
        allMemberHistories.forEach(memberMatches => {
          memberMatches.forEach(match => {
            if (!seenMatches.has(match.match_id)) {
              seenMatches.add(match.match_id);
              allMatchIds.add(match.match_id);
            }
          });
        });

        console.log(`Found ${allMatchIds.size} unique matches across all team members`);

        // Track statistics
        let stats = { total: allMatchIds.size, success: 0, error404: 0, otherError: 0, filtered: 0 };

        // Fetch match details for each unique match
        const matchDetailsPromises = Array.from(allMatchIds).map(async (matchId) => {
          try {
            // Get both match overview and detailed stats
            const [matchData, matchStats] = await Promise.all([
              api.getMatch(matchId),
              api.getMatchStats(matchId)
            ]);
            stats.success++;

            // Debug: Log the full match data structure for first match
            if (stats.success === 1) {
              console.log('=== SAMPLE MATCH DATA ===');
              console.log('Full matchData:', JSON.stringify(matchData, null, 2));
              console.log('Voting data:', matchData.voting);
              console.log('========================');
            }

            // Extract team info from getMatch response
            const teams = matchData.teams || {};
            const faction1 = teams.faction1 || Object.values(teams)[0];
            const faction2 = teams.faction2 || Object.values(teams)[1];

            if (!faction1 || !faction2) {
              return null; // Skip if no teams found
            }

            // Find which faction is our team based on team name
            let opponentFaction = null;
            let ourFactionId = null;

            if (faction1.name === teamDetails.name) {
              opponentFaction = faction2;
              ourFactionId = faction1.faction_id;
            } else if (faction2.name === teamDetails.name) {
              opponentFaction = faction1;
              ourFactionId = faction2.faction_id;
            } else {
              // Team name doesn't match - this is a pug or individual match, skip it
              stats.filtered++;
              return null;
            }

            // Process Veto Data
            if (matchData.voting && matchData.voting.map) {
              const mapVoting = matchData.voting.map;
              const entities = mapVoting.entities || [];
              const picks = mapVoting.pick || [];

              if (Array.isArray(picks) && picks.length > 0) {
                // Check if elements are objects
                if (typeof picks[0] === 'object') {
                  const bestOf = matchData.best_of || '1';
                  picks.forEach((vote, index) => {
                    if (vote.team_id === ourFactionId) {
                      // Determine if Ban or Pick based on index and Format
                      let action = 'unknown';
                      if (bestOf === '1') {
                        action = 'ban';
                      } else if (bestOf === '3') {
                        // BO3: Ban (0), Ban (1), Pick (2), Pick (3), Ban (4), Ban (5)...
                        if (index === 0 || index === 1 || index === 4 || index === 5) {
                          action = 'ban';
                        } else if (index === 2 || index === 3) {
                          action = 'pick';
                        }
                      }

                      // Map GUID to Name
                      const mapEntity = entities.find(e => e.guid === vote.guid);
                      if (mapEntity) {
                        const mapName = normalizeMapName(mapEntity.name || mapEntity.class_name);

                        if (action === 'ban') {
                          fullTeamData.vetoStats.bans[mapName] = (fullTeamData.vetoStats.bans[mapName] || 0) + 1;
                        } else if (action === 'pick') {
                          fullTeamData.vetoStats.picks[mapName] = (fullTeamData.vetoStats.picks[mapName] || 0) + 1;
                        }
                      }
                    }
                  });
                  fullTeamData.vetoStats.totalVetos++;
                }
              }
            }

            // Use matchStats to get actual round data
            const opponent = opponentFaction.name || 'Unknown';
            const matchTimestamp = matchData.started_at || matchData.finished_at || Date.now() / 1000;
            const championship_name = matchData.competition_name || '';

            // matchStats.rounds contains the actual map data with round scores
            const rounds = matchStats.rounds || [];

            // Debug: Log first match to understand structure
            if (stats.success === 1) {
              console.log('Match stats structure:', {
                roundsCount: rounds.length,
                hasRounds: rounds.length > 0,
                firstRound: rounds[0] ? {
                  hasRoundStats: !!rounds[0].round_stats,
                  hasTeams: !!rounds[0].teams,
                  mapName: rounds[0].round_stats?.Map
                } : null
              });
            }

            // Process each round (map) in the match
            if (rounds.length > 0) {
              console.log(`Processing match ${matchId} with ${rounds.length} rounds`);

              return rounds.map((round, roundIndex) => {
                const roundStats = round.round_stats || {};
                const teams = round.teams || [];

                // Find our team and opponent in this round
                const playerTeam = teams.find(t => t.team_id === teamDetails.team_id);
                const opponentTeam = teams.find(t => t.team_id !== teamDetails.team_id);

                if (!playerTeam || !opponentTeam) {
                  console.warn(`Could not find teams in round ${roundIndex} of match ${matchId}`);
                  return null;
                }

                // Get actual round scores (e.g., 13-7, not 1-0)
                const playerScore = parseInt(playerTeam.team_stats?.['Final Score']) || 0;
                const opponentScore = parseInt(opponentTeam.team_stats?.['Final Score']) || 0;
                const result = playerScore > opponentScore ? 'W' : 'L';

                // Get map name from round_stats
                const rawMap = roundStats.Map ||
                  roundStats.map ||
                  'Unknown';

                console.log(`  Round ${roundIndex + 1}: ${rawMap} - ${result} ${playerScore}-${opponentScore}`);

                return {
                  matchId: rounds.length > 1 ? `${matchId}-map${roundIndex}` : matchId,
                  originalMatchId: matchId,
                  map: rawMap,
                  result,
                  score: `${playerScore}-${opponentScore}`,
                  date: new Date(matchTimestamp * 1000).toLocaleDateString(),
                  opponent,
                  championship_name,
                  isBO3Map: rounds.length > 1,
                  mapNumber: roundIndex + 1,
                };
              }).filter(map => map !== null && map.map !== 'Unknown');
            }

            // Fallback: if no rounds data, skip this match
            console.warn(`No rounds data for match ${matchId}`);
            return null;
          } catch (err) {
            // Track error types
            if (err.status === 404) {
              stats.error404++;
            } else {
              stats.otherError++;
              console.warn('Error processing match:', matchId, err);
            }
            return null;
          }
        });

        // Flatten results since BO3 matches return arrays, filter out nulls
        const matchDetails = (await Promise.all(matchDetailsPromises))
          .filter(m => m !== null)
          .flat(); // Flatten arrays from BO3 matches
        stats.filtered = stats.success - matchDetails.length;

        console.log('Match processing stats:', stats);
        console.log(`Successfully processed ${matchDetails.length} matches`);

        // Store ALL matches (unfiltered) for season filtering
        fullTeamData.allMatches = matchDetails;

        console.log('All matches stored:', matchDetails.length);
      } catch (err) {
        console.warn('Failed to fetch match history:', err);
      }

      setTeam(fullTeamData);
    } catch (err) {
      console.error('Error fetching team data:', err);
      setError(`Failed to fetch data for ${team.name}: ${err.message}`);
      // Still set the basic team data
      setTeam(team);
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Filter team data by selected season and recalculate stats
  const filterBySeason = useCallback((teamData, season) => {
    if (!teamData || !teamData.allMatches) return teamData;

    // Clone the team data
    const filtered = JSON.parse(JSON.stringify(teamData));

    // Filter matches by season (championship_name contains "S52", "S53", etc.)
    const seasonMatches = teamData.allMatches.filter(match =>
      match.championship_name && match.championship_name.includes(season)
    );

    console.log(`Filtered to ${seasonMatches.length} matches for ${season}`);

    // Reset map stats
    Object.keys(filtered.mapStats).forEach(mapName => {
      filtered.mapStats[mapName] = {
        ...filtered.mapStats[mapName],
        matches: [],
        wins: 0,
        losses: 0,
        played: 0,
        wr: 0,
      };
    });

    // Organize filtered matches by map and calculate stats
    seasonMatches.forEach(match => {
      const rawMapName = match.map;
      let normalizedMap = MAP_DISPLAY_NAMES[rawMapName];

      if (!normalizedMap) {
        // Handle unknown map names
        normalizedMap = rawMapName.replace(/^de_/, '')
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join('');
      }

      // Normalize the map name to match our consistent format
      normalizedMap = normalizeMapName(normalizedMap);

      const mapKey = Object.keys(filtered.mapStats).find(
        key => key.toLowerCase().replace(/\s/g, '') === normalizedMap.toLowerCase().replace(/\s/g, '')
      );

      if (mapKey) {
        filtered.mapStats[mapKey].matches.push(match);
        filtered.mapStats[mapKey].played++;
        if (match.result === 'W') {
          filtered.mapStats[mapKey].wins++;
        } else {
          filtered.mapStats[mapKey].losses++;
        }
        filtered.mapStats[mapKey].wr = filtered.mapStats[mapKey].played > 0
          ? Math.round((filtered.mapStats[mapKey].wins / filtered.mapStats[mapKey].played) * 100)
          : 0;
      }
    });

    // Recalculate overall record
    let totalWins = 0;
    let totalMatches = 0;
    Object.values(filtered.mapStats).forEach(mapStat => {
      totalWins += mapStat.wins;
      totalMatches += mapStat.played;
    });

    filtered.record = {
      wins: totalWins,
      losses: totalMatches - totalWins,
      matches: totalMatches,
      winRate: totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0,
    };

    return filtered;
  }, []);

  // Apply season filter to teams
  const filteredTeamA = useMemo(() => filterBySeason(teamA, selectedSeason), [teamA, selectedSeason, filterBySeason]);


  return (
    <div className="app-container">
      <header className={`app-header ${headerCollapsed ? 'collapsed' : ''}`}>
        <div className="header-collapsible-content">
          <div className="header-brand">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1>FACEIT Compare</h1>
            <span className="brand-tag">CS2 Team Analytics</span>
          </div>

          <ApiKeyInput
            apiKey={apiKey}
            setApiKey={setApiKey}
            onVerify={handleVerifyApiKey}
            verificationStatus={apiKeyStatus}
          />
        </div>

        <button
          className="header-collapse-btn"
          onClick={() => setHeaderCollapsed(!headerCollapsed)}
          aria-label={headerCollapsed ? "Expand header" : "Collapse header"}
        >
          {headerCollapsed ? '▼' : '▲'}
        </button>

        <div className="header-selectors">
          <TeamSearch
            label="Select Team"
            selectedTeam={teamA}
            onSelect={(team) => handleTeamSelect(team, setTeamA)}
            excludeId={null}
            api={api}
          />
        </div>

        {/* Season Selector */}
        {filteredTeamA && (
          <div className="season-selector">
            <label htmlFor="season-select">Season:</label>
            <select
              id="season-select"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="season-select"
            >
              <option value="S55">Season 55</option>
              <option value="S54">Season 54</option>
              <option value="S53">Season 53</option>
              <option value="S52">Season 52</option>
            </select>
          </div>
        )}
      </header>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : filteredTeamA ? (
        <>
          <nav className="section-nav">
            <button
              className={activeSection === 'compare' ? 'active' : ''}
              onClick={() => setActiveSection('compare')}
            >
              Team Overview
            </button>
            <button
              className={activeSection === 'maps' ? 'active' : ''}
              onClick={() => setActiveSection('maps')}
            >
              Map Stats
            </button>
            <button
              className={activeSection === 'veto_stats' ? 'active' : ''}
              onClick={() => setActiveSection('veto_stats')}
            >
              Veto Stats
            </button>
          </nav>

          <main className="main-content">
            {activeSection === 'compare' && (
              <section className="single-team-section">
                <div className="unified-team-card">
                  <TeamCard team={filteredTeamA} side="team-a" />

                  <div className="overview-divider"></div>

                  <div className="team-overview-section">
                    <h3>Team Overview</h3>
                    <div className="overview-stats">
                      <div className="overview-stat">
                        <span className="stat-label">Win Rate</span>
                        <span className="stat-value">{filteredTeamA.record.winRate}%</span>
                        <span className="stat-subtext">{filteredTeamA.record.wins}W - {filteredTeamA.record.losses}L</span>
                      </div>
                      <div className="stat-divider"></div>
                      <div className="overview-stat">
                        <span className="stat-label">Total Matches</span>
                        <span className="stat-value">{filteredTeamA.record.matches}</span>
                        <span className="stat-subtext">Last 6 Months</span>
                      </div>
                      <div className="stat-divider"></div>
                      <div className="overview-stat">
                        <span className="stat-label">Average Rating</span>
                        <span className="stat-value">
                          {(filteredTeamA.roster.reduce((sum, p) => sum + p.rating, 0) / filteredTeamA.roster.length).toFixed(2)}
                        </span>
                        <span className="stat-subtext">Team Average</span>
                      </div>
                      <div className="stat-divider"></div>
                      <div className="overview-stat">
                        <span className="stat-label">Maps Played</span>
                        <span className="stat-value">{Object.keys(filteredTeamA.mapStats || {}).length}</span>
                        <span className="stat-subtext">Unique Maps</span>
                      </div>
                    </div>
                  </div>

                  <div className="overview-divider"></div>

                  <MapOverviewPanel
                    teamA={filteredTeamA}
                    teamB={null}
                    singleMode={true}
                  />
                </div>
              </section>
            )}

            {activeSection === 'maps' && (
              <section className="maps-section">
                <div className="section-header">
                  <h2>Map Stats Dashboard</h2>
                  <p>Detailed per-map performance analysis</p>
                </div>
                <MapStatsDashboard
                  teamA={filteredTeamA}
                  teamB={null}
                  singleMode={true}
                />
              </section>
            )}

            {activeSection === 'veto_stats' && (
              <section className="veto-stats-section">
                <div className="section-header">
                  <h2>Veto Statistics</h2>
                  <p>Analysis of map bans and picks from match history</p>
                </div>
                <VetoStats
                  teamA={filteredTeamA}
                  teamB={null}
                />
              </section>
            )}
          </main>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🛡️</div>
          <h2>Select a Team</h2>
          <p>Search and select a team to begin analysis</p>
        </div>
      )}


      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .app-container {
          --bg-primary: #0d0d0f;
          --bg-secondary: #141418;
          --bg-tertiary: #1c1c22;
          --bg-card: #18181d;
          --bg-hover: #222228;
          
          --text-primary: #f0f0f2;
          --text-secondary: #a0a0a8;
          --text-muted: #606068;
          
          --faceit-orange: #ff5500;
          --faceit-orange-dim: rgba(255, 85, 0, 0.15);
          --faceit-orange-glow: rgba(255, 85, 0, 0.3);
          
          --team-a: #ff6b6b;
          --team-a-dim: rgba(255, 107, 107, 0.15);
          

          
          --win: #4ade80;
          --loss: #f87171;
          --ban: #ef4444;
          --pick: #22c55e;
          --decider: #f59e0b;
          
          --border-subtle: rgba(255, 255, 255, 0.06);
          --border-medium: rgba(255, 255, 255, 0.1);
          
          --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.4);
          --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.5);
          --shadow-lg: 0 8px 40px rgba(0, 0, 0, 0.6);
          
          --radius-sm: 6px;
          --radius-md: 10px;
          --radius-lg: 16px;
          
          font-family: 'Outfit', -apple-system, sans-serif;
          background: var(--bg-primary);
          color: var(--text-primary);
          min-height: 100vh;
          line-height: 1.5;
        }

        .app-header {
          background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
          border-bottom: 1px solid var(--border-subtle);
          padding: 20px 32px;
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(20px);
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .brand-icon {
          color: var(--faceit-orange);
          filter: drop-shadow(0 0 10px var(--faceit-orange-glow));
        }

        .header-brand h1 {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, var(--text-primary) 0%, var(--faceit-orange) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .brand-tag {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          padding: 4px 10px;
          background: var(--bg-tertiary);
          border-radius: 20px;
        }

        /* API Key Section */
        .api-key-section {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px;
          margin-bottom: 20px;
        }

        .api-key-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 10px;
        }

        .api-key-input-wrapper {
          display: flex;
          gap: 8px;
        }

        .api-key-input-wrapper input {
          flex: 1;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          padding: 10px 14px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
        }

        .api-key-input-wrapper input:focus {
          outline: none;
          border-color: var(--faceit-orange);
          box-shadow: 0 0 0 3px var(--faceit-orange-dim);
        }

        .toggle-visibility {
          background: var(--bg-secondary);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-sm);
          padding: 0 12px;
          cursor: pointer;
          font-size: 16px;
        }

        .clear-api-btn {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 600;
          padding: 0 14px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .clear-api-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--loss);
        }

        .verify-btn {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 600;
          padding: 0 16px;
          background: var(--faceit-orange);
          border: none;
          border-radius: var(--radius-sm);
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .verify-btn:hover:not(:disabled) {
          background: #ff6a1a;
          box-shadow: 0 0 12px var(--faceit-orange-glow);
        }

        .verify-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .mini-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .status-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 10px;
          margin-left: auto;
        }

        .status-badge.valid {
          background: rgba(74, 222, 128, 0.15);
          color: var(--win);
        }

        .status-badge.invalid {
          background: rgba(248, 113, 113, 0.15);
          color: var(--loss);
        }

        /* League Selector */
        .league-selector {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px;
          margin-bottom: 20px;
        }

        .league-selector label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .league-dropdown-wrapper {
          position: relative;
        }

        .league-select-btn {
          font-family: 'Outfit', sans-serif;
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .league-select-btn:hover {
          border-color: var(--faceit-orange);
          background: var(--bg-hover);
        }

        .dropdown-arrow {
          font-size: 10px;
          color: var(--text-muted);
        }

        .league-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-md);
          max-height: 300px;
          overflow-y: auto;
          z-index: 1000;
          box-shadow: var(--shadow-lg);
        }

        .league-option {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid var(--border-subtle);
        }

        .league-option:last-child {
          border-bottom: none;
        }

        .league-option:hover {
          background: var(--bg-hover);
        }

        .league-option strong {
          font-size: 14px;
          color: var(--text-primary);
        }

        .league-desc {
          font-size: 12px;
          color: var(--text-muted);
        }

        .league-loading, .league-empty {
          padding: 16px;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
        }

        .season-filter-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 8px 12px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          border-radius: var(--radius-sm);
          font-size: 12px;
          color: var(--text-secondary);
        }

        .filter-icon {
          font-size: 14px;
        }

        /* Hub URL Input */
        .hub-url-input {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .hub-url-input input {
          flex: 1;
          font-family: 'Outfit', sans-serif;
          padding: 10px 14px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          font-size: 13px;
        }

        .hub-url-input input:focus {
          outline: none;
          border-color: var(--faceit-orange);
          box-shadow: 0 0 0 3px var(--faceit-orange-dim);
        }

        .url-submit-btn {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 600;
          padding: 0 20px;
          background: var(--faceit-orange);
          border: none;
          border-radius: var(--radius-sm);
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 60px;
        }

        .url-submit-btn:hover:not(:disabled) {
          background: #ff6a1a;
          box-shadow: 0 0 12px var(--faceit-orange-glow);
        }

        .url-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .url-error {
          color: var(--loss);
          font-size: 12px;
          margin-top: -8px;
          margin-bottom: 8px;
        }

        .or-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 16px 0;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 600;
        }

        .or-divider::before,
        .or-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border-subtle);
        }

        .error-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          padding: 8px 12px;
          background: rgba(248, 113, 113, 0.15);
          border: 1px solid rgba(248, 113, 113, 0.3);
          border-radius: var(--radius-sm);
          font-size: 12px;
          color: var(--loss);
        }

        .success-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          padding: 8px 12px;
          background: rgba(74, 222, 128, 0.15);
          border: 1px solid rgba(74, 222, 128, 0.3);
          border-radius: var(--radius-sm);
          font-size: 12px;
          color: var(--win);
        }

        .api-key-help {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 8px;
        }

        .api-key-help a {
          color: var(--faceit-orange);
          text-decoration: none;
        }

        .demo-mode-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          padding: 8px 12px;
          background: var(--faceit-orange-dim);
          border-radius: var(--radius-sm);
          font-size: 12px;
          color: var(--faceit-orange);
        }

        /* View Mode Toggle */
        .view-mode-toggle {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .view-mode-btn {
          flex: 1;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 20px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-mode-btn:hover {
          background: var(--bg-hover);
          border-color: var(--border-hover);
          color: var(--text-primary);
        }

        .view-mode-btn.active {
          background: var(--faceit-orange-dim);
          border-color: var(--faceit-orange);
          color: var(--faceit-orange);
        }

        /* Team Search */
        .header-selectors {
          display: flex;
          align-items: flex-end;
          gap: 16px;
          flex-wrap: wrap;
        }

        .team-search {
          position: relative;
          flex: 1;
          min-width: 240px;
        }

        .team-search label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
        }

        .search-input-wrapper input {
          width: 100%;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 500;
          padding: 12px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-md);
          color: var(--text-primary);
        }

        .search-input-wrapper input:focus {
          outline: none;
          border-color: var(--faceit-orange);
          box-shadow: 0 0 0 3px var(--faceit-orange-dim);
        }

        .clear-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 18px;
          cursor: pointer;
        }

        .search-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-md);
          margin-top: 4px;
          max-height: 240px;
          overflow-y: auto;
          z-index: 1000;
          box-shadow: var(--shadow-lg);
        }

        .search-result {
          display: flex;
          justify-content: space-between;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .search-result:hover {
          background: var(--bg-hover);
        }

        .result-name {
          font-weight: 500;
        }

        .result-tag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: var(--text-muted);
        }

        .search-loading, .no-results, .search-hint {
          padding: 16px;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
        }

        .vs-indicator {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-muted);
          padding: 12px 20px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-sm);
        }

        /* Error Banner */
        .error-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 24px;
          background: rgba(239, 68, 68, 0.15);
          border-bottom: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          font-size: 13px;
        }

        .error-banner button {
          background: none;
          border: none;
          color: inherit;
          font-size: 18px;
          cursor: pointer;
        }

        /* Loading Spinner */
        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px;
          gap: 16px;
          color: var(--text-muted);
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-medium);
          border-top-color: var(--faceit-orange);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Navigation */
        .section-nav {
          display: flex;
          gap: 4px;
          padding: 12px 32px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-subtle);
        }

        .section-nav button {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 20px;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .section-nav button:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }

        .section-nav button.active {
          color: var(--faceit-orange);
          background: var(--faceit-orange-dim);
        }

        /* Main Content */
        .main-content {
          padding: 32px;
          max-width: 1600px;
          margin: 0 auto;
        }

        .section-header {
          margin-bottom: 24px;
        }

        .header-title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 16px;
        }

        .section-header h2 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .section-header p {
          font-size: 13px;
          color: var(--text-muted);
        }

        .format-selector {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .format-selector label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .format-buttons {
          display: flex;
          gap: 6px;
          background: var(--bg-tertiary);
          padding: 4px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
        }

        .format-btn {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 16px;
          background: transparent;
          border: none;
          border-radius: 4px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .format-btn:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }

        .format-btn.active {
          background: var(--faceit-orange);
          color: white;
          box-shadow: 0 2px 8px var(--faceit-orange-glow);
        }

        /* Teams Grid */
        .teams-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        @media (max-width: 1024px) {
          .teams-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Single Team Section */
        .single-team-section {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Unified Team Card - combines team info, overview stats, and map overview */
        .unified-team-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
          overflow: hidden;
        }

        .unified-team-card .team-card {
          background: transparent;
          border: none;
          box-shadow: none;
          margin: 0;
        }

        .overview-divider {
          height: 1px;
          background: var(--border-subtle);
          margin: 0;
        }

        .team-overview-section {
          padding: 32px 40px;
        }

        .team-overview-section h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 20px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .overview-stats {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .overview-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          flex: 1;
          text-align: center;
        }

        .overview-stat .stat-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
        }

        .overview-stat .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
        }

        .overview-stat .stat-subtext {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .stat-divider {
          width: 1px;
          height: 60px;
          background: var(--border-subtle);
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .overview-stats {
            flex-wrap: wrap;
          }

          .stat-divider {
            display: none;
          }

          .overview-stat {
            min-width: calc(50% - 8px);
          }
        }

        /* At a Glance Section */
        .at-a-glance-section {
          padding: 32px;
        }

        .glance-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        @media (max-width: 900px) {
          .glance-grid {
            grid-template-columns: 1fr;
          }
        }

        .glance-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 24px;
          box-shadow: var(--shadow-sm);
        }

        .glance-card h3 {
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
          margin-bottom: 16px;
          text-align: center;
        }

        .glance-comparison {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
        }

        .glance-team {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .glance-team .team-tag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: var(--radius-sm);
        }

        .glance-team.team-a .team-tag {
          background: var(--team-a-dim);
          color: var(--team-a);
        }

        .glance-team.team-b .team-tag {
          background: var(--team-b-dim);
          color: var(--team-b);
        }

        .glance-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 32px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .glance-vs {
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: var(--text-muted);
          padding: 0 8px;
        }

        .glance-bar {
          display: flex;
          height: 8px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: var(--bg-tertiary);
        }

        .glance-fill {
          transition: width 0.5s ease;
        }

        .glance-fill.team-a {
          background: linear-gradient(90deg, var(--team-a), #ff8f8f);
        }

        .glance-fill.team-b {
          background: linear-gradient(90deg, #7eddd6, var(--team-b));
        }

        /* Team Card */
        .team-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 24px;
          box-shadow: var(--shadow-md);
        }

        .team-card.team-a {
          border-top: 3px solid var(--team-a);
        }

        .team-card.team-b {
          border-top: 3px solid var(--team-b);
        }

        .team-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .team-logo {
          font-size: 40px;
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .team-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .team-info h2 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .team-tag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          margin-right: 12px;
        }

        .faceit-link {
          font-size: 11px;
          color: var(--faceit-orange);
          text-decoration: none;
        }

        .faceit-link:hover {
          text-decoration: underline;
        }

        .team-record {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          margin-bottom: 24px;
        }

        .record-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .record-num {
          font-family: 'JetBrains Mono', monospace;
          font-size: 28px;
          font-weight: 700;
        }

        .record-item.wins .record-num { color: var(--win); }
        .record-item.losses .record-num { color: var(--loss); }

        .record-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
        }

        .record-divider {
          font-size: 24px;
          color: var(--text-muted);
        }

        .record-wr {
          margin-left: auto;
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          font-weight: 600;
          color: var(--faceit-orange);
          padding: 6px 12px;
          background: var(--faceit-orange-dim);
          border-radius: var(--radius-sm);
        }

        .section-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--text-muted);
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-subtle);
        }

        /* Roster Table */
        .roster-table {
          margin-bottom: 24px;
        }

        .roster-header, .roster-row, .roster-avg {
          display: grid;
          grid-template-columns: 1.5fr 0.8fr 0.8fr 0.6fr 0.6fr;
          gap: 8px;
          padding: 10px 12px;
          align-items: center;
        }

        .roster-header {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);
        }

        .roster-row {
          font-size: 13px;
          border-bottom: 1px solid var(--border-subtle);
          cursor: pointer;
          transition: background 0.2s;
        }

        .roster-row:hover {
          background: var(--bg-hover);
        }

        .roster-avg {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          background: var(--bg-tertiary);
          border-radius: var(--radius-sm);
          margin-top: 8px;
        }

        .player-name {
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .leader-badge {
          color: var(--faceit-orange);
          font-size: 12px;
        }

        /* Skill Level Badge */
        .skill-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 4px;
        }

        .skill-elite { background: linear-gradient(135deg, #ff5500 0%, #ff7733 100%); color: #fff; }
        .skill-high { background: rgba(255, 85, 0, 0.2); color: var(--faceit-orange); }
        .skill-mid { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
        .skill-low { background: rgba(250, 204, 21, 0.2); color: #facc15; }
        .skill-new { background: var(--bg-tertiary); color: var(--text-muted); }

        /* Rating Badge */
        .rating-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 4px;
        }

        .rating-elite { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #000; }
        .rating-high { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
        .rating-good { background: rgba(0, 217, 255, 0.15); color: #00d9ff; }
        .rating-avg { background: var(--bg-tertiary); color: var(--text-secondary); }
        .rating-low { background: rgba(239, 68, 68, 0.2); color: #f87171; }

        /* Tooltip */
        .tooltip-wrapper {
          position: relative;
        }

        .tooltip-content {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          font-size: 12px;
          white-space: nowrap;
          z-index: 1000;
          box-shadow: var(--shadow-lg);
          margin-bottom: 8px;
        }

        .player-tooltip div {
          margin: 4px 0;
          color: var(--text-secondary);
        }

        /* Recent Matches */
        .recent-matches {
          margin-bottom: 24px;
        }

        .match-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid var(--border-subtle);
        }

        .match-result {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 600;
        }

        .match-result.win {
          background: rgba(74, 222, 128, 0.15);
          color: var(--win);
        }

        .match-result.loss {
          background: rgba(248, 113, 113, 0.15);
          color: var(--loss);
        }

        .match-opponent {
          font-size: 13px;
          flex: 1;
        }

        .match-date {
          font-size: 11px;
          color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
        }

        /* Win Rate Bars */
        .map-wr-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .wr-bar-container {
          display: grid;
          grid-template-columns: 80px 1fr auto;
          gap: 12px;
          align-items: center;
          padding: 8px;
          border-radius: var(--radius-sm);
          transition: background 0.2s;
        }

        .wr-bar-container:hover {
          background: var(--bg-hover);
        }

        .wr-bar-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .wr-bar-track {
          height: 10px;
          background: var(--bg-tertiary);
          border-radius: 5px;
          overflow: hidden;
          border: 1px solid var(--border-subtle);
        }

        .wr-bar-fill {
          height: 100%;
          border-radius: 5px;
          transition: width 0.5s ease;
        }

        .wr-bar-fill.team-a {
          background: linear-gradient(90deg, var(--team-a) 0%, #ff8f8f 100%);
        }

        .wr-bar-fill.team-b {
          background: linear-gradient(90deg, var(--team-b) 0%, #7eddd6 100%);
        }

        .wr-bar-stats {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .wr-record {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          min-width: 60px;
        }

        .wr-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          min-width: 40px;
          text-align: right;
        }

        .no-data {
          font-size: 13px;
          color: var(--text-muted);
          text-align: center;
          padding: 16px;
        }

        /* Veto Timeline */
        .veto-timeline {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 24px;
          margin-bottom: 24px;
        }

        .timeline-track {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 16px;
        }

        .timeline-step {
          flex: 0 0 auto;
          width: 100px;
          padding: 16px 12px;
          background: var(--bg-secondary);
          border: 2px solid var(--border-subtle);
          border-radius: var(--radius-md);
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .timeline-step:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }

        .timeline-step.ban { border-color: var(--ban); background: rgba(239, 68, 68, 0.1); }
        .timeline-step.pick { border-color: var(--pick); background: rgba(34, 197, 94, 0.1); }
        .timeline-step.decider { border-color: var(--decider); background: rgba(245, 158, 11, 0.1); }

        .step-number {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .step-action {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .timeline-step.ban .step-action { color: var(--ban); }
        .timeline-step.pick .step-action { color: var(--pick); }
        .timeline-step.decider .step-action { color: var(--decider); }

        .step-map {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .step-team {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 4px;
          display: inline-block;
        }

        .timeline-step.team-a .step-team { background: var(--team-a-dim); color: var(--team-a); }
        .timeline-step.team-d .step-team { background: var(--bg-tertiary); color: var(--text-muted); }

        .timeline-legend {
          display: flex;
          gap: 20px;
          justify-content: center;
          padding-top: 12px;
          border-top: 1px solid var(--border-subtle);
        }

        .legend-item {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 4px;
        }

        .legend-item.ban { background: rgba(239, 68, 68, 0.15); color: var(--ban); }
        .legend-item.pick { background: rgba(34, 197, 94, 0.15); color: var(--pick); }
        .legend-item.decider { background: rgba(245, 158, 11, 0.15); color: var(--decider); }

        .veto-tooltip {
          text-align: center;
        }

        .veto-reason {
          font-size: 12px;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .veto-team {
          font-size: 11px;
          color: var(--text-muted);
        }



        /* Map Stats Dashboard */
        .map-stats-dashboard {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .map-tabs {
          display: flex;
          gap: 4px;
          padding: 16px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-subtle);
          overflow-x: auto;
        }

        .map-tab {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 600;
          padding: 8px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .map-tab:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .map-tab.active {
          background: var(--faceit-orange-dim);
          border-color: var(--faceit-orange);
          color: var(--faceit-orange);
        }

        /* Map Overview Section */
        .map-overview-section {
          padding: 32px 40px;
          background: transparent;
          border: none;
          border-radius: 0;
          margin: 0;
        }

        .unified-team-card .map-overview-section {
          padding: 32px 40px;
        }

        .map-overview-section h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 20px;
          text-align: left;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .map-overview-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          max-width: 1200px;
          margin: 0 auto;
        }

        @media (max-width: 900px) {
          .map-overview-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 500px) {
          .map-overview-grid {
            grid-template-columns: 1fr;
          }
        }

        .overview-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          transition: all 0.2s ease;
        }

        .overview-card:hover {
          border-color: var(--faceit-orange);
          transform: translateY(-2px);
        }

        .overview-card.highlight-positive {
          background: rgba(34, 197, 94, 0.05);
          border-color: rgba(34, 197, 94, 0.3);
        }

        .overview-card.highlight-negative {
          background: rgba(239, 68, 68, 0.05);
          border-color: rgba(239, 68, 68, 0.3);
        }

        .overview-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .overview-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 20px;
          font-weight: 700;
          color: var(--faceit-orange);
          margin-bottom: 4px;
        }

        .overview-subtext {
          font-size: 11px;
          color: var(--text-secondary);
        }



        /* Map Win Rates Section (in Map Stats) */
        .map-winrates-section {
          padding: 24px;
          background: var(--bg-primary);
          border-bottom: 1px solid var(--border-subtle);
        }

        .map-winrates-section h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 20px;
          text-align: center;
        }



        /* Collapsible Map Items */
        .map-wr-item {
          display: flex;
          flex-direction: column;
        }

        .map-wr-clickable {
          position: relative;
          cursor: pointer;
          transition: all 0.2s ease;
          padding-right: 32px;
        }

        .map-wr-clickable:hover {
          background: var(--bg-hover);
          border-radius: var(--radius-sm);
        }

        .expand-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
          color: var(--text-muted);
          transition: transform 0.3s ease;
          pointer-events: none;
        }

        .expand-icon.expanded {
          transform: translateY(-50%) rotate(0deg);
        }

        .map-matches-expanded {
          padding: 16px;
          background: var(--bg-secondary);
          border-left: 3px solid var(--faceit-orange);
          margin-top: 8px;
          border-radius: var(--radius-sm);
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
            padding: 0 16px;
          }
          to {
            opacity: 1;
            max-height: 2000px;
            padding: 16px;
          }
        }

        .map-matches-expanded h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 12px;
          text-align: left;
        }

        .map-matches-expanded .match-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .map-matches-expanded .match-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          font-size: 13px;
        }

        .map-matches-expanded .match-opponent {
          flex: 1;
          color: var(--text-secondary);
        }

        .map-matches-expanded .match-date {
          color: var(--text-muted);
          font-size: 11px;
        }

        .map-matches-expanded .match-link {
          color: var(--faceit-orange);
          text-decoration: none;
          font-size: 12px;
          font-weight: 600;
          transition: color 0.2s ease;
        }

        .map-matches-expanded .match-link:hover {
          color: var(--faceit-orange-bright);
        }

        .map-matches-expanded .no-matches {
          color: var(--text-muted);
          font-size: 13px;
          text-align: center;
          padding: 12px;
        }



        .map-team-header {
          margin-bottom: 20px;
        }

        .team-indicator {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: var(--radius-sm);
        }

        .team-indicator.team-a { background: var(--team-a-dim); color: var(--team-a); }
        .team-indicator.team-b { background: var(--team-b-dim); color: var(--team-b); }

        .stat-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px;
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);
        }

        .stat-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .stat-value.large {
          font-size: 28px;
        }

        .stat-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .map-visual {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          background: var(--bg-secondary);
          min-width: 200px;
        }

        .map-icon {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 2px;
          color: var(--faceit-orange);
          text-shadow: 0 0 30px var(--faceit-orange-glow);
          margin-bottom: 24px;
        }





        .map-matches h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .match-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .match-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .match-item:hover {
          background: var(--bg-hover);
          border-color: var(--border-hover);
          transform: translateX(2px);
        }

        .match-opponent {
          flex: 1;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .match-date {
          color: var(--text-muted);
          font-size: 11px;
        }

        .match-link {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          background: var(--faceit-orange-dim);
          color: var(--faceit-orange);
          text-decoration: none;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .match-link:hover {
          background: var(--faceit-orange);
          color: #000;
        }

        .no-matches {
          padding: 32px 16px;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
          font-style: italic;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
        }

        /* Season Selector */
        .season-selector {
          margin-top: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .season-selector label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .season-select {
          background: var(--bg-card);
          color: var(--text-primary);
          border: 1px solid var(--border-subtle);
          padding: 8px 16px;
          border-radius: var(--radius-md);
          font-size: 14px;
          min-width: 150px;
          cursor: pointer;
          outline: none;
          transition: border-color 0.2s;
        }

        .season-select:focus {
          border-color: var(--faceit-orange);
        }

        .season-select option {
          background: var(--bg-secondary);
          color: var(--text-primary);
          padding: 8px;
        }

        /* Empty State */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 32px;
          text-align: center;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 24px;
          opacity: 0.5;
        }

        .empty-state h2 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .empty-state p {
          font-size: 14px;
          color: var(--text-muted);
        }

        /* Header Collapse Styles */
        .header-collapse-btn {
          position: absolute;
          top: 8px;
          right: 16px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          transition: color 0.2s;
        }

        .header-collapse-btn:hover {
          color: var(--text-primary);
        }

        .app-header.collapsed .header-collapsible-content {
          display: none;
        }

        .app-header {
          position: relative;
          transition: all 0.3s ease;
        }

        .app-header.collapsed {
          padding: 12px 32px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .app-header {
            padding: 16px 20px;
          }

          .header-selectors {
            flex-direction: column;
            align-items: stretch;
          }

          .team-search {
            min-width: 100%;
          }

          .vs-indicator {
            text-align: center;
          }

          .main-content {
            padding: 20px;
          }

          .section-nav {
            padding: 12px 16px;
            overflow-x: auto;
          }

          .prediction-summary {
            flex-direction: column;
          }

          .vs-badge {
            padding: 8px 0;
          }

          .pool-maps {
            flex-direction: column;
            align-items: center;
          }

          .stat-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Veto Stats */
        .veto-stats-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .veto-stats-wrapper {
          display: flex;
          gap: 24px;
          align-items: stretch;
        }

        .veto-stats-card {
          flex: 1;
          background: var(--bg-secondary);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-md);
          padding: 20px;
        }

        .veto-stats-card h4 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 16px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px;
          border-radius: var(--radius-sm);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
        }

        .stat-item.ban {
          border-left: 3px solid var(--ban);
        }

        .stat-item.pick {
          border-left: 3px solid var(--pick);
        }

        .stat-item.info {
          border-left: 3px solid var(--text-muted);
        }

        .stat-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
        }

        .stat-value {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .stat-count {
          font-size: 12px;
          color: var(--text-muted);
        }

        .vs-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 14px;
          color: var(--text-muted);
          background: var(--bg-tertiary);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          align-self: center;
          flex-shrink: 0;
          border: 1px solid var(--border-medium);
        }

        .veto-details {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid var(--border-subtle);
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .veto-list h5 {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .veto-list-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-sm);
          margin-bottom: 6px;
        }

        .veto-list-item .map-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .veto-list-item .count {
          font-size: 12px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .no-data {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-muted);
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
        }

        .no-data p {
          margin: 0;
        }

        @media (max-width: 768px) {
          .veto-stats-wrapper {
            flex-direction: column;
          }

          .vs-divider {
            margin: 0 auto;
          }

          .veto-details {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div >
  );
}
