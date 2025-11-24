import React, { useState, useMemo, useCallback, useEffect } from 'react';

// ============================================================================
// FACEIT API CONFIGURATION
// ============================================================================

const FACEIT_API_BASE = 'https://open.faceit.com/data/v4';
const GAME_ID = 'cs2'; // CS2 game ID for FACEIT

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
          `${FACEIT_API_BASE}/games?offset=0&limit=1`,
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
        `${FACEIT_API_BASE}/search/teams?nickname=${encodeURIComponent(nickname)}&game=${GAME_ID}&limit=${limit}`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to search teams');
      return response.json();
    },

    // Get team details
    getTeam: async (teamId) => {
      const response = await fetch(
        `${FACEIT_API_BASE}/teams/${teamId}`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get team');
      return response.json();
    },

    // Get team statistics
    getTeamStats: async (teamId) => {
      const response = await fetch(
        `${FACEIT_API_BASE}/teams/${teamId}/stats/${GAME_ID}`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get team stats');
      return response.json();
    },

    // Get player details
    getPlayer: async (playerId) => {
      const response = await fetch(
        `${FACEIT_API_BASE}/players/${playerId}`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get player');
      return response.json();
    },

    // Get player statistics
    getPlayerStats: async (playerId) => {
      const response = await fetch(
        `${FACEIT_API_BASE}/players/${playerId}/stats/${GAME_ID}`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get player stats');
      return response.json();
    },

    // Get player match history
    getPlayerHistory: async (playerId, limit = 20) => {
      const response = await fetch(
        `${FACEIT_API_BASE}/players/${playerId}/history?game=${GAME_ID}&limit=${limit}`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get player history');
      return response.json();
    },

    // Get match statistics
    getMatchStats: async (matchId) => {
      const response = await fetch(
        `${FACEIT_API_BASE}/matches/${matchId}/stats`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get match stats');
      return response.json();
    },

    // Search for players
    searchPlayers: async (nickname, limit = 20) => {
      const response = await fetch(
        `${FACEIT_API_BASE}/search/players?nickname=${encodeURIComponent(nickname)}&game=${GAME_ID}&limit=${limit}`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to search players');
      return response.json();
    },

    // Get hub details (for league/division info)
    getHub: async (hubId) => {
      const response = await fetch(
        `${FACEIT_API_BASE}/hubs/${hubId}`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get hub');
      return response.json();
    },

    // Get hub stats/leaderboard
    getHubStats: async (hubId, limit = 100) => {
      const response = await fetch(
        `${FACEIT_API_BASE}/hubs/${hubId}/stats?limit=${limit}`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get hub stats');
      return response.json();
    },
  };
};

// ============================================================================
// DATA TRANSFORMATION UTILITIES
// ============================================================================

// Current CS2 Active Duty Map Pool (as of 2025)
// Train, Dust2, Mirage, Overpass, Inferno, Nuke (Anubis removed when Train added back)
const ALL_MAPS = ['de_train', 'de_dust2', 'de_mirage', 'de_overpass', 'de_inferno', 'de_nuke'];
const MAP_DISPLAY_NAMES = {
  'de_train': 'Train',
  'de_dust2': 'Dust 2',
  'de_mirage': 'Mirage',
  'de_overpass': 'Overpass',
  'de_inferno': 'Inferno',
  'de_nuke': 'Nuke',
  // Legacy maps (for old data compatibility)
  'de_anubis': 'Anubis',
  'de_ancient': 'Ancient',
  'de_vertigo': 'Vertigo',
};

// Transform FACEIT API data to our app format
const transformTeamData = (teamDetails, teamStats, memberStats) => {
  const lifetime = teamStats?.lifetime || {};
  const segments = teamStats?.segments || [];
  
  // Extract map stats from segments
  const mapStats = {};
  segments.forEach(segment => {
    if (segment.type === 'Map' && segment.mode === '5v5') {
      const mapName = segment.label;
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
// VETO PREDICTION LOGIC
// ============================================================================

const predictVeto = (teamA, teamB) => {
  const mapDiffs = ALL_MAPS.map(map => {
    const displayName = MAP_DISPLAY_NAMES[map] || map;
    return {
      map: displayName,
      mapKey: map,
      teamAWr: teamA.mapStats[displayName]?.wr || teamA.mapStats[map]?.wr || 50,
      teamBWr: teamB.mapStats[displayName]?.wr || teamB.mapStats[map]?.wr || 50,
      teamAPlayed: teamA.mapStats[displayName]?.played || teamA.mapStats[map]?.played || 0,
      teamBPlayed: teamB.mapStats[displayName]?.played || teamB.mapStats[map]?.played || 0,
    };
  });

  // Sort by win rate for each team
  const teamAWorst = [...mapDiffs].sort((a, b) => a.teamAWr - b.teamAWr);
  const teamBWorst = [...mapDiffs].sort((a, b) => a.teamBWr - b.teamBWr);
  const teamABest = [...mapDiffs].sort((a, b) => b.teamAWr - a.teamAWr);
  const teamBBest = [...mapDiffs].sort((a, b) => b.teamBWr - a.teamBWr);

  // Simulate BO3 veto
  const banned = new Set();
  const picked = [];
  const vetoOrder = [];

  // Ban 1 - Team A bans worst map
  const teamABan1 = teamAWorst.find(m => !banned.has(m.map));
  if (teamABan1) {
    banned.add(teamABan1.map);
    vetoOrder.push({ team: 'A', action: 'ban', map: teamABan1.map, reason: `Lowest WR (${teamABan1.teamAWr}%)` });
  }

  // Ban 2 - Team B bans worst map
  const teamBBan1 = teamBWorst.find(m => !banned.has(m.map));
  if (teamBBan1) {
    banned.add(teamBBan1.map);
    vetoOrder.push({ team: 'B', action: 'ban', map: teamBBan1.map, reason: `Lowest WR (${teamBBan1.teamBWr}%)` });
  }

  // Pick 1 - Team A picks best remaining
  const teamAPick = teamABest.find(m => !banned.has(m.map) && !picked.includes(m.map));
  if (teamAPick) {
    picked.push(teamAPick.map);
    vetoOrder.push({ team: 'A', action: 'pick', map: teamAPick.map, reason: `Highest WR (${teamAPick.teamAWr}%)` });
  }

  // Pick 2 - Team B picks best remaining
  const teamBPick = teamBBest.find(m => !banned.has(m.map) && !picked.includes(m.map));
  if (teamBPick) {
    picked.push(teamBPick.map);
    vetoOrder.push({ team: 'B', action: 'pick', map: teamBPick.map, reason: `Highest WR (${teamBPick.teamBWr}%)` });
  }

  // Ban 3 - Team A bans opponent's strength
  const teamABan2 = teamBBest.find(m => !banned.has(m.map) && !picked.includes(m.map));
  if (teamABan2) {
    banned.add(teamABan2.map);
    vetoOrder.push({ team: 'A', action: 'ban', map: teamABan2.map, reason: `Counter ${teamB.tag}'s ${teamABan2.teamBWr}% WR` });
  }

  // Ban 4 - Team B bans opponent's strength
  const teamBBan2 = teamABest.find(m => !banned.has(m.map) && !picked.includes(m.map));
  if (teamBBan2) {
    banned.add(teamBBan2.map);
    vetoOrder.push({ team: 'B', action: 'ban', map: teamBBan2.map, reason: `Counter ${teamA.tag}'s ${teamBBan2.teamAWr}% WR` });
  }

  // Decider
  const deciderMap = mapDiffs.find(m => !banned.has(m.map) && !picked.includes(m.map));
  if (deciderMap) {
    vetoOrder.push({ team: 'D', action: 'decider', map: deciderMap.map, reason: 'Last remaining map' });
    picked.push(deciderMap.map);
  }

  // High difference maps
  const highDiffMaps = mapDiffs
    .map(m => ({ ...m, diff: Math.abs(m.teamAWr - m.teamBWr) }))
    .filter(m => m.diff >= 15)
    .sort((a, b) => b.diff - a.diff);

  return {
    vetoOrder,
    predictedPool: picked,
    highDiffMaps,
    teamALikelyBan: teamABan1?.map,
    teamBLikelyBan: teamBBan1?.map,
    teamALikelyPick: teamAPick?.map,
    teamBLikelyPick: teamBPick?.map,
  };
};

// ============================================================================
// SAMPLE DATA (Used when API key not provided)
// ============================================================================

const SAMPLE_TEAMS = {
  team_a: {
    id: 'sample_team_a',
    name: 'Phantom Protocol',
    tag: 'PHP',
    avatar: null,
    record: { wins: 12, losses: 4, matches: 16, winRate: 75 },
    roster: [
      { id: '1', name: 'fr0st', role: 'Leader', rating: 1.18, hs: 42, kpr: 0.78, skillLevel: 8, wins: 156, matches: 200, winRate: 78 },
      { id: '2', name: 'cyb3r', role: 'Member', rating: 1.24, hs: 58, kpr: 0.84, skillLevel: 9, wins: 142, matches: 190, winRate: 75 },
      { id: '3', name: 'sh4dow', role: 'Member', rating: 1.08, hs: 51, kpr: 0.72, skillLevel: 7, wins: 128, matches: 180, winRate: 71 },
      { id: '4', name: 'bl1tz', role: 'Member', rating: 0.98, hs: 44, kpr: 0.68, skillLevel: 6, wins: 115, matches: 175, winRate: 66 },
      { id: '5', name: 'n0va', role: 'Member', rating: 1.12, hs: 55, kpr: 0.76, skillLevel: 8, wins: 134, matches: 185, winRate: 72 },
    ],
    mapStats: {
      'Train': { wr: 67, played: 15, wins: 10, losses: 5 },
      'Dust 2': { wr: 68, played: 16, wins: 11, losses: 5 },
      'Mirage': { wr: 72, played: 18, wins: 13, losses: 5 },
      'Overpass': { wr: 60, played: 10, wins: 6, losses: 4 },
      'Inferno': { wr: 65, played: 14, wins: 9, losses: 5 },
      'Nuke': { wr: 45, played: 11, wins: 5, losses: 6 },
    },
    recentMatches: [
      { opponent: 'Team Nexus', result: 'W', score: '2-1', date: '2025-01-18' },
      { opponent: 'Dark Matter', result: 'W', score: '2-0', date: '2025-01-15' },
      { opponent: 'Echo Five', result: 'L', score: '1-2', date: '2025-01-12' },
      { opponent: 'Storm Rising', result: 'W', score: '2-1', date: '2025-01-09' },
      { opponent: 'Cipher Squad', result: 'W', score: '2-0', date: '2025-01-06' },
    ],
  },
  team_b: {
    id: 'sample_team_b',
    name: 'Velocity Gaming',
    tag: 'VLG',
    avatar: null,
    record: { wins: 10, losses: 6, matches: 16, winRate: 63 },
    roster: [
      { id: '6', name: 'zephyr', role: 'Leader', rating: 1.06, hs: 48, kpr: 0.72, skillLevel: 7, wins: 122, matches: 180, winRate: 68 },
      { id: '7', name: 'havoc', role: 'Member', rating: 1.20, hs: 38, kpr: 0.82, skillLevel: 9, wins: 148, matches: 195, winRate: 76 },
      { id: '8', name: 'ghost', role: 'Member', rating: 1.16, hs: 56, kpr: 0.80, skillLevel: 8, wins: 138, matches: 188, winRate: 73 },
      { id: '9', name: 'cipher', role: 'Member', rating: 0.94, hs: 46, kpr: 0.66, skillLevel: 6, wins: 108, matches: 172, winRate: 63 },
      { id: '10', name: 'apex', role: 'Member', rating: 1.10, hs: 52, kpr: 0.74, skillLevel: 7, wins: 126, matches: 178, winRate: 71 },
    ],
    mapStats: {
      'Train': { wr: 50, played: 12, wins: 6, losses: 6 },
      'Dust 2': { wr: 52, played: 14, wins: 7, losses: 7 },
      'Mirage': { wr: 55, played: 20, wins: 11, losses: 9 },
      'Overpass': { wr: 63, played: 16, wins: 10, losses: 6 },
      'Inferno': { wr: 78, played: 18, wins: 14, losses: 4 },
      'Nuke': { wr: 70, played: 14, wins: 10, losses: 4 },
    },
    recentMatches: [
      { opponent: 'Neon Nights', result: 'L', score: '0-2', date: '2025-01-17' },
      { opponent: 'Arctic Wolves', result: 'W', score: '2-1', date: '2025-01-14' },
      { opponent: 'Team Nexus', result: 'W', score: '2-0', date: '2025-01-11' },
      { opponent: 'Pulse Gaming', result: 'W', score: '2-1', date: '2025-01-08' },
      { opponent: 'Crimson Five', result: 'L', score: '1-2', date: '2025-01-05' },
    ],
  },
};

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
        // Use real API when available
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
  
  const mapEntries = Object.entries(team.mapStats || {});
  
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

      <div className="section-title">Map Win Rates (Current Pool)</div>
      <div className="map-wr-list">
        {mapEntries.length > 0 ? mapEntries
          .filter(([mapName]) => ALL_MAPS.includes(Object.keys(MAP_DISPLAY_NAMES).find(key => MAP_DISPLAY_NAMES[key] === mapName)))
          .map(([mapName, stats]) => (
            <WinRateBar
              key={mapName}
              wr={stats.wr || 0}
              label={mapName}
              teamColor={side}
              wins={stats.wins || 0}
              losses={stats.losses || 0}
              played={stats.played || 0}
            />
          )) : (
          <div className="no-data">No map data available</div>
        )}
      </div>
    </div>
  );
};

// Veto Timeline Component
const VetoTimeline = ({ vetoOrder, teamA, teamB }) => (
  <div className="veto-timeline">
    <div className="timeline-track">
      {vetoOrder.map((step, idx) => (
        <Tooltip 
          key={idx}
          content={
            <div className="veto-tooltip">
              <div className="veto-reason">{step.reason}</div>
              {step.team !== 'D' && (
                <div className="veto-team">
                  {step.team === 'A' ? teamA.name : teamB.name}
                </div>
              )}
            </div>
          }
        >
          <div className={`timeline-step ${step.action} team-${step.team.toLowerCase()}`}>
            <div className="step-number">{idx + 1}</div>
            <div className="step-action">{step.action.toUpperCase()}</div>
            <div className="step-map">{step.map}</div>
            <div className="step-team">
              {step.team === 'A' ? teamA.tag : step.team === 'B' ? teamB.tag : '?'}
            </div>
          </div>
        </Tooltip>
      ))}
    </div>
    <div className="timeline-legend">
      <span className="legend-item ban">Ban</span>
      <span className="legend-item pick">Pick</span>
      <span className="legend-item decider">Decider</span>
    </div>
  </div>
);

// Veto Prediction Panel
const VetoPrediction = ({ prediction, teamA, teamB }) => (
  <div className="veto-prediction">
    <div className="prediction-summary">
      <div className="prediction-card team-a">
        <div className="pred-team">{teamA.tag}</div>
        <div className="pred-items">
          <div className="pred-item">
            <span className="pred-label">Likely Ban</span>
            <span className="pred-map ban">{prediction.teamALikelyBan || 'N/A'}</span>
          </div>
          <div className="pred-item">
            <span className="pred-label">Likely Pick</span>
            <span className="pred-map pick">{prediction.teamALikelyPick || 'N/A'}</span>
          </div>
        </div>
      </div>
      
      <div className="vs-badge">VS</div>
      
      <div className="prediction-card team-b">
        <div className="pred-team">{teamB.tag}</div>
        <div className="pred-items">
          <div className="pred-item">
            <span className="pred-label">Likely Ban</span>
            <span className="pred-map ban">{prediction.teamBLikelyBan || 'N/A'}</span>
          </div>
          <div className="pred-item">
            <span className="pred-label">Likely Pick</span>
            <span className="pred-map pick">{prediction.teamBLikelyPick || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>

    {prediction.highDiffMaps && prediction.highDiffMaps.length > 0 && (
      <div className="high-diff-section">
        <div className="section-title">High Winrate Difference Maps (≥15%)</div>
        <div className="high-diff-maps">
          {prediction.highDiffMaps.map((m, idx) => (
            <div key={idx} className="diff-map-card">
              <div className="diff-map-name">{m.map}</div>
              <div className="diff-bars">
                <div className="diff-team">
                  <span>{teamA.tag}</span>
                  <span className={m.teamAWr > m.teamBWr ? 'higher' : ''}>{m.teamAWr}%</span>
                </div>
                <div className="diff-indicator">
                  <span className="diff-value">Δ {m.diff}%</span>
                </div>
                <div className="diff-team">
                  <span>{teamB.tag}</span>
                  <span className={m.teamBWr > m.teamAWr ? 'higher' : ''}>{m.teamBWr}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="predicted-pool">
      <div className="section-title">Predicted Map Pool</div>
      <div className="pool-maps">
        {prediction.predictedPool.map((map, idx) => (
          <div key={map} className={`pool-map ${idx === 2 ? 'decider' : ''}`}>
            <span className="pool-map-num">Map {idx + 1}</span>
            <span className="pool-map-name">{map}</span>
            {idx === 2 && <span className="pool-map-tag">Decider</span>}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Map Stats Dashboard
const MapStatsDashboard = ({ teamA, teamB }) => {
  const [selectedMap, setSelectedMap] = useState('Mirage');
  
  const mapDataA = teamA.mapStats[selectedMap] || { wr: 50, played: 0 };
  const mapDataB = teamB.mapStats[selectedMap] || { wr: 50, played: 0 };

  const availableMaps = [...new Set([
    ...Object.keys(teamA.mapStats || {}),
    ...Object.keys(teamB.mapStats || {})
  ])];

  return (
    <div className="map-stats-dashboard">
      <div className="map-tabs">
        {availableMaps.map(map => (
          <button
            key={map}
            className={`map-tab ${selectedMap === map ? 'active' : ''}`}
            onClick={() => setSelectedMap(map)}
          >
            {map}
          </button>
        ))}
      </div>

      <div className="map-comparison">
        <div className="map-team-stats team-a-stats">
          <div className="map-team-header">
            <span className="team-indicator team-a">{teamA.tag}</span>
          </div>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-value large">{mapDataA.wr}%</span>
              <span className="stat-label">Win Rate</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{mapDataA.played}</span>
              <span className="stat-label">Maps Played</span>
            </div>
          </div>
        </div>

        <div className="map-visual">
          <div className="map-icon">{selectedMap.toUpperCase()}</div>
          <div className="wr-comparison">
            <div className="wr-compare-bar">
              <div 
                className="wr-fill team-a" 
                style={{ width: `${(mapDataA.wr / (mapDataA.wr + mapDataB.wr)) * 100}%` }}
              >
                {mapDataA.wr}%
              </div>
              <div 
                className="wr-fill team-b" 
                style={{ width: `${(mapDataB.wr / (mapDataA.wr + mapDataB.wr)) * 100}%` }}
              >
                {mapDataB.wr}%
              </div>
            </div>
          </div>
        </div>

        <div className="map-team-stats team-b-stats">
          <div className="map-team-header">
            <span className="team-indicator team-b">{teamB.tag}</span>
          </div>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-value large">{mapDataB.wr}%</span>
              <span className="stat-label">Win Rate</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{mapDataB.played}</span>
              <span className="stat-label">Maps Played</span>
            </div>
          </div>
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
  
  return (
    <div className="api-key-section">
      <div className="api-key-header">
        <span className="api-icon">🔑</span>
        <span>FACEIT API Key</span>
        {verificationStatus === 'valid' && <span className="status-badge valid">✓ Verified</span>}
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
        {verificationStatus === 'valid' && (
          <button
            className="clear-api-btn"
            onClick={() => setApiKey('')}
            title="Clear API key"
          >
            Clear
          </button>
        )}
        <button
          className="verify-btn"
          onClick={handleVerify}
          disabled={!apiKey.trim() || isVerifying || verificationStatus === 'valid'}
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
      {verificationStatus === 'valid' && (
        <div className="success-notice">
          <span className="success-icon">✓</span>
          API key verified! You can now search for real FACEIT teams.
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function FACEITTeamCompare() {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState(null); // null, 'valid', 'invalid'
  const [teamA, setTeamA] = useState(SAMPLE_TEAMS.team_a);
  const [teamB, setTeamB] = useState(SAMPLE_TEAMS.team_b);
  const [activeSection, setActiveSection] = useState('compare');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    if (team.roster && team.mapStats) {
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
      const memberStatsArray = await Promise.all(memberStatsPromises);

      const memberStats = {};
      teamDetails.members.forEach((member, idx) => {
        memberStats[member.user_id] = memberStatsArray[idx];
      });

      const fullTeamData = transformTeamData(teamDetails, teamStats, memberStats);
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

  const vetoPrediction = useMemo(() => {
    if (teamA && teamB) {
      return predictVeto(teamA, teamB);
    }
    return null;
  }, [teamA, teamB]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
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
        
        <div className="header-selectors">
          <TeamSearch
            label="Team A"
            selectedTeam={teamA}
            onSelect={(team) => handleTeamSelect(team, setTeamA)}
            excludeId={teamB?.id}
            api={api}
          />
          <div className="vs-indicator">VS</div>
          <TeamSearch
            label="Team B"
            selectedTeam={teamB}
            onSelect={(team) => handleTeamSelect(team, setTeamB)}
            excludeId={teamA?.id}
            api={api}
          />
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : teamA && teamB ? (
        <>
          <nav className="section-nav">
            <button 
              className={activeSection === 'compare' ? 'active' : ''} 
              onClick={() => setActiveSection('compare')}
            >
              Team Comparison
            </button>
            <button 
              className={activeSection === 'veto' ? 'active' : ''} 
              onClick={() => setActiveSection('veto')}
            >
              Veto Prediction
            </button>
            <button 
              className={activeSection === 'maps' ? 'active' : ''} 
              onClick={() => setActiveSection('maps')}
            >
              Map Stats
            </button>
          </nav>

          <main className="main-content">
            {activeSection === 'compare' && (
              <section className="comparison-section">
                <div className="teams-grid">
                  <TeamCard team={teamA} side="team-a" />
                  <TeamCard team={teamB} side="team-b" />
                </div>
              </section>
            )}

            {activeSection === 'veto' && vetoPrediction && (
              <section className="veto-section">
                <div className="section-header">
                  <h2>Pick & Ban Visualizer</h2>
                  <p>Standard BO3 Format</p>
                </div>
                <VetoTimeline vetoOrder={vetoPrediction.vetoOrder} teamA={teamA} teamB={teamB} />
                <VetoPrediction prediction={vetoPrediction} teamA={teamA} teamB={teamB} />
              </section>
            )}

            {activeSection === 'maps' && (
              <section className="maps-section">
                <div className="section-header">
                  <h2>Map Stats Dashboard</h2>
                  <p>Detailed per-map performance analysis</p>
                </div>
                <MapStatsDashboard teamA={teamA} teamB={teamB} />
              </section>
            )}
          </main>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">⚔️</div>
          <h2>Select Two Teams</h2>
          <p>Search and select teams to begin analysis</p>
        </div>
      )}

      <footer className="app-footer">
        <p>Powered by FACEIT Data API</p>
        <p className="footer-note">
          <a href="https://docs.faceit.com/docs/data-api/" target="_blank" rel="noopener noreferrer">
            API Documentation
          </a>
        </p>
      </footer>

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
          
          --team-b: #4ecdc4;
          --team-b-dim: rgba(78, 205, 196, 0.15);
          
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

        .section-header h2 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .section-header p {
          font-size: 13px;
          color: var(--text-muted);
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
        .timeline-step.team-b .step-team { background: var(--team-b-dim); color: var(--team-b); }
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

        /* Veto Prediction */
        .veto-prediction {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 24px;
        }

        .prediction-summary {
          display: flex;
          align-items: stretch;
          gap: 20px;
          margin-bottom: 32px;
        }

        .prediction-card {
          flex: 1;
          padding: 20px;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
        }

        .prediction-card.team-a { border-left: 3px solid var(--team-a); }
        .prediction-card.team-b { border-left: 3px solid var(--team-b); }

        .pred-team {
          font-family: 'JetBrains Mono', monospace;
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 16px;
        }

        .prediction-card.team-a .pred-team { color: var(--team-a); }
        .prediction-card.team-b .pred-team { color: var(--team-b); }

        .pred-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pred-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .pred-label {
          font-size: 12px;
          color: var(--text-muted);
        }

        .pred-map {
          font-size: 13px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 4px;
        }

        .pred-map.ban { background: rgba(239, 68, 68, 0.15); color: var(--ban); }
        .pred-map.pick { background: rgba(34, 197, 94, 0.15); color: var(--pick); }

        .vs-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          color: var(--text-muted);
          padding: 0 12px;
        }

        .high-diff-section {
          margin-bottom: 32px;
        }

        .high-diff-maps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .diff-map-card {
          padding: 16px;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
        }

        .diff-map-name {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
          text-align: center;
        }

        .diff-bars {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .diff-team {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          font-size: 11px;
        }

        .diff-team span:first-child {
          color: var(--text-muted);
          font-weight: 600;
        }

        .diff-team span:last-child {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 600;
        }

        .diff-team .higher {
          color: var(--win);
        }

        .diff-indicator {
          padding: 4px 8px;
          background: var(--bg-tertiary);
          border-radius: 4px;
        }

        .diff-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          color: var(--decider);
        }

        .predicted-pool {
          padding-top: 20px;
          border-top: 1px solid var(--border-subtle);
        }

        .pool-maps {
          display: flex;
          gap: 16px;
          justify-content: center;
        }

        .pool-map {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 16px 24px;
          background: var(--bg-secondary);
          border: 2px solid var(--border-medium);
          border-radius: var(--radius-md);
        }

        .pool-map.decider {
          border-color: var(--decider);
          background: rgba(245, 158, 11, 0.1);
        }

        .pool-map-num {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
        }

        .pool-map-name {
          font-size: 16px;
          font-weight: 600;
        }

        .pool-map-tag {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--decider);
          padding: 2px 8px;
          background: rgba(245, 158, 11, 0.2);
          border-radius: 10px;
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

        .map-comparison {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 0;
        }

        @media (max-width: 900px) {
          .map-comparison {
            grid-template-columns: 1fr;
          }
          .map-visual {
            order: -1;
          }
        }

        .map-team-stats {
          padding: 24px;
        }

        .map-team-stats.team-a-stats {
          border-right: 1px solid var(--border-subtle);
        }

        .map-team-stats.team-b-stats {
          border-left: 1px solid var(--border-subtle);
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

        .wr-comparison {
          width: 100%;
        }

        .wr-compare-bar {
          display: flex;
          height: 32px;
          border-radius: var(--radius-sm);
          overflow: hidden;
        }

        .wr-compare-bar .wr-fill {
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 700;
          color: #000;
          transition: width 0.5s ease;
        }

        .wr-compare-bar .wr-fill.team-a {
          background: linear-gradient(135deg, var(--team-a) 0%, #ff8f8f 100%);
        }

        .wr-compare-bar .wr-fill.team-b {
          background: linear-gradient(135deg, #7eddd6 0%, var(--team-b) 100%);
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

        /* Footer */
        .app-footer {
          text-align: center;
          padding: 24px 32px;
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
        }

        .app-footer p {
          font-size: 12px;
          color: var(--text-muted);
        }

        .footer-note {
          margin-top: 4px;
        }

        .footer-note a {
          color: var(--faceit-orange);
          text-decoration: none;
        }

        .footer-note a:hover {
          text-decoration: underline;
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
      `}</style>
    </div>
  );
}
