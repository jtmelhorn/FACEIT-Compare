/**
 * Championship Database Builder
 * Builds an in-memory database of teams, players, and matches from championship data
 */

/**
 * Build a searchable database from match data
 * @param {Array} matches - Array of match objects from FACEIT API
 * @param {Array} matchStats - Array of detailed match statistics (optional)
 * @returns {Object} Database object with teams, players, and matches
 */
export function buildDatabase(matches, matchStats = []) {
  const database = {
    teams: new Map(),      // teamId -> team object
    players: new Map(),    // playerId -> player object
    matches: [],           // all matches
    matchStats: new Map(), // matchId -> detailed stats
    metadata: {
      totalMatches: 0,
      totalTeams: 0,
      totalPlayers: 0,
      dateRange: { earliest: null, latest: null },
      championships: new Set()
    }
  };

  // Process basic matches
  for (const match of matches) {
    processMatch(match, database);
  }

  // Process detailed match stats
  for (const stats of matchStats) {
    processMatchStats(stats, database);
  }

  // Finalize metadata
  database.metadata.totalMatches = database.matches.length;
  database.metadata.totalTeams = database.teams.size;
  database.metadata.totalPlayers = database.players.size;
  database.metadata.championships = Array.from(database.metadata.championships);

  // Debug: Log summary
  console.log('=== DATABASE BUILD COMPLETE ===');
  console.log(`Total Matches: ${database.metadata.totalMatches}`);
  console.log(`Total Teams: ${database.metadata.totalTeams}`);
  console.log(`Total Players: ${database.metadata.totalPlayers}`);
  console.log(`Championships: ${database.metadata.championships.length}`);

  // Show sample teams
  if (database.teams.size > 0) {
    const sampleTeams = Array.from(database.teams.values()).slice(0, 5);
    console.log('Sample teams:', sampleTeams.map(t => `${t.teamName} (${t.matches.length} matches)`));
  }
  console.log('===============================');

  return database;
}

/**
 * Process a single match and add teams/players to database
 * @param {Object} match - Match object from API
 * @param {Object} database - Database object to update
 */
function processMatch(match, database) {
  // Add match to list
  database.matches.push(match);

  // Track championship
  if (match.competition_id) {
    database.metadata.championships.add(match.competition_id);
  }

  // Update date range
  if (match.started_at || match.finished_at) {
    const matchDate = match.finished_at || match.started_at;
    const date = new Date(matchDate * 1000);

    if (!database.metadata.dateRange.earliest || date < database.metadata.dateRange.earliest) {
      database.metadata.dateRange.earliest = date;
    }
    if (!database.metadata.dateRange.latest || date > database.metadata.dateRange.latest) {
      database.metadata.dateRange.latest = date;
    }
  }

  // Debug: Log first match structure
  if (database.matches.length === 1) {
    console.log('First match structure:', JSON.stringify(match, null, 2));
  }

  // Process teams
  if (match.teams) {
    for (const team of Object.values(match.teams)) {
      if (!team) continue;

      // Debug log for team structure
      if (database.teams.size === 0) {
        console.log('First team structure:', JSON.stringify(team, null, 2));
      }

      // Try to get team_id from different possible fields
      const teamId = team.team_id || team.id || team.faction_id;
      const teamName = team.name || team.nickname || team.faction_name || 'Unknown Team';

      if (!teamId) {
        console.warn('Match has team without ID:', team);
        continue;
      }

      if (!database.teams.has(teamId)) {
        database.teams.set(teamId, {
          teamId: teamId,
          teamName: teamName,
          matches: [],
          players: new Set(),
          stats: {
            wins: 0,
            losses: 0,
            totalMatches: 0
          }
        });
      }

      const teamObj = database.teams.get(teamId);
      if (match.match_id) {
        teamObj.matches.push(match.match_id);
      }

      // Add players from roster
      if (team.roster) {
        for (const player of team.roster) {
          if (!player || !player.player_id) continue;

          teamObj.players.add(player.player_id);

          // Add player to players map
          if (!database.players.has(player.player_id)) {
            database.players.set(player.player_id, {
              playerId: player.player_id,
              playerName: player.nickname || 'Unknown Player',
              teams: new Set(),
              matches: []
            });
          }

          const playerObj = database.players.get(player.player_id);
          playerObj.teams.add(teamId);
          if (match.match_id) {
            playerObj.matches.push(match.match_id);
          }
        }
      }
    }
  } else {
    // If no teams field, log the match structure
    if (database.matches.length === 1) {
      console.warn('Match has no teams field. Full match:', match);
    }
  }
}

/**
 * Process detailed match stats and enhance database
 * @param {Object} stats - Match stats object from API
 * @param {Object} database - Database object to update
 */
function processMatchStats(stats, database) {
  if (!stats || !stats.rounds || stats.rounds.length === 0) return;

  const matchId = stats.rounds[0].match_id;
  if (!matchId) return;

  database.matchStats.set(matchId, stats);

  // Extract additional team and player information from stats
  if (stats.rounds && stats.rounds[0].teams) {
    for (const team of stats.rounds[0].teams) {
      if (!team || !team.team_id) continue;

      // Update or create team entry
      if (!database.teams.has(team.team_id)) {
        database.teams.set(team.team_id, {
          teamId: team.team_id,
          teamName: team.team_stats?.Team || 'Unknown Team',
          matches: [],
          players: new Set(),
          stats: {
            wins: 0,
            losses: 0,
            totalMatches: 0
          }
        });
      }

      const teamObj = database.teams.get(team.team_id);

      // Add match to team's matches if not already there
      if (!teamObj.matches.includes(matchId)) {
        teamObj.matches.push(matchId);
      }

      // Process players from team stats
      if (team.players) {
        for (const player of team.players) {
          if (!player || !player.player_id) continue;

          teamObj.players.add(player.player_id);

          // Add/update player
          if (!database.players.has(player.player_id)) {
            database.players.set(player.player_id, {
              playerId: player.player_id,
              playerName: player.nickname || 'Unknown Player',
              teams: new Set(),
              matches: []
            });
          }

          const playerObj = database.players.get(player.player_id);
          playerObj.teams.add(team.team_id);

          if (!playerObj.matches.includes(matchId)) {
            playerObj.matches.push(matchId);
          }
        }
      }
    }
  }
}

/**
 * Search for teams by name (case-insensitive, partial match)
 * @param {Object} database - Database object
 * @param {string} searchTerm - Team name to search for
 * @returns {Array} Array of matching team objects
 */
export function searchTeamsByName(database, searchTerm) {
  const term = searchTerm.toLowerCase();
  const results = [];

  console.log(`Searching for teams matching "${searchTerm}" in ${database.teams.size} total teams`);

  for (const team of database.teams.values()) {
    if (team.teamName.toLowerCase().includes(term)) {
      results.push({
        ...team,
        players: Array.from(team.players)
      });
    }
  }

  console.log(`Found ${results.length} matching teams:`, results.map(t => t.teamName));

  return results;
}

/**
 * Search for players by name (case-insensitive, partial match)
 * @param {Object} database - Database object
 * @param {string} searchTerm - Player name to search for
 * @returns {Array} Array of matching player objects
 */
export function searchPlayersByName(database, searchTerm) {
  const term = searchTerm.toLowerCase();
  const results = [];

  for (const player of database.players.values()) {
    if (player.playerName.toLowerCase().includes(term)) {
      results.push({
        ...player,
        teams: Array.from(player.teams)
      });
    }
  }

  return results;
}

/**
 * Get team by exact ID
 * @param {Object} database - Database object
 * @param {string} teamId - Team ID
 * @returns {Object|null} Team object or null
 */
export function getTeamById(database, teamId) {
  const team = database.teams.get(teamId);
  if (!team) return null;

  return {
    ...team,
    players: Array.from(team.players)
  };
}

/**
 * Get player by exact ID
 * @param {Object} database - Database object
 * @param {string} playerId - Player ID
 * @returns {Object|null} Player object or null
 */
export function getPlayerById(database, playerId) {
  const player = database.players.get(playerId);
  if (!player) return null;

  return {
    ...player,
    teams: Array.from(player.teams)
  };
}

/**
 * Get all matches for a team
 * @param {Object} database - Database object
 * @param {string} teamId - Team ID
 * @returns {Array} Array of match objects
 */
export function getTeamMatches(database, teamId) {
  const team = database.teams.get(teamId);
  if (!team) return [];

  return database.matches.filter(match => team.matches.includes(match.match_id));
}

/**
 * Get all matches for a player
 * @param {Object} database - Database object
 * @param {string} playerId - Player ID
 * @returns {Array} Array of match objects
 */
export function getPlayerMatches(database, playerId) {
  const player = database.players.get(playerId);
  if (!player) return [];

  return database.matches.filter(match => player.matches.includes(match.match_id));
}

/**
 * Get detailed stats for a match
 * @param {Object} database - Database object
 * @param {string} matchId - Match ID
 * @returns {Object|null} Match stats or null
 */
export function getMatchStats(database, matchId) {
  return database.matchStats.get(matchId) || null;
}

/**
 * Export database to JSON (for saving/loading)
 * Optimized for localStorage by storing only essential data
 * @param {Object} database - Database object
 * @param {boolean} compress - If true, store minimal data (default: true)
 * @returns {string} JSON string
 */
export function exportDatabase(database, compress = true) {
  if (!compress) {
    // Full export (for file downloads)
    const exportable = {
      teams: Array.from(database.teams.entries()).map(([, team]) => ({
        ...team,
        players: Array.from(team.players)
      })),
      players: Array.from(database.players.entries()).map(([, player]) => ({
        ...player,
        teams: Array.from(player.teams)
      })),
      matches: database.matches,
      matchStats: Array.from(database.matchStats.entries()),
      metadata: {
        ...database.metadata,
        championships: Array.from(database.metadata.championships)
      }
    };
    return JSON.stringify(exportable, null, 2);
  }

  // Compressed export - store only match IDs and essential metadata
  const exportable = {
    teams: Array.from(database.teams.entries()).map(([id, team]) => ({
      teamId: team.teamId,
      teamName: team.teamName,
      matches: team.matches, // Just IDs
      players: Array.from(team.players),
      stats: team.stats
    })),
    players: Array.from(database.players.entries()).map(([id, player]) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      teams: Array.from(player.teams),
      matches: player.matches // Just IDs
    })),
    // Store only essential match data - minimal fields
    matches: database.matches.map(m => ({
      match_id: m.match_id,
      competition_id: m.competition_id,
      competition_name: m.competition_name,
      started_at: m.started_at,
      finished_at: m.finished_at,
      // Store only team IDs and names, not full team objects with rosters
      teams: m.teams ? Object.fromEntries(
        Object.entries(m.teams).map(([key, team]) => [
          key,
          {
            team_id: team.team_id || team.id || team.faction_id,
            name: team.name || team.nickname || team.faction_name
          }
        ])
      ) : null
    })),
    // Don't store full matchStats in compressed mode - fetch on demand
    metadata: {
      ...database.metadata,
      championships: Array.from(database.metadata.championships)
    },
    _compressed: true,
    _version: '1.0'
  };

  return JSON.stringify(exportable);
}

/**
 * Import database from JSON (supports both compressed and full formats)
 * @param {string} jsonString - JSON string
 * @returns {Object} Database object
 */
export function importDatabase(jsonString) {
  const data = JSON.parse(jsonString);

  const database = {
    teams: new Map(),
    players: new Map(),
    matches: data.matches || [],
    matchStats: new Map(data.matchStats || []),
    metadata: data.metadata || {
      totalMatches: 0,
      totalTeams: 0,
      totalPlayers: 0,
      dateRange: { earliest: null, latest: null },
      championships: []
    },
    _compressed: data._compressed || false,
    _version: data._version || '1.0'
  };

  // Restore teams
  for (const team of data.teams || []) {
    database.teams.set(team.teamId, {
      ...team,
      players: new Set(team.players)
    });
  }

  // Restore players
  for (const player of data.players || []) {
    database.players.set(player.playerId, {
      ...player,
      teams: new Set(player.teams)
    });
  }

  // Convert date strings back to Date objects
  if (database.metadata.dateRange.earliest) {
    database.metadata.dateRange.earliest = new Date(database.metadata.dateRange.earliest);
  }
  if (database.metadata.dateRange.latest) {
    database.metadata.dateRange.latest = new Date(database.metadata.dateRange.latest);
  }

  database.metadata.championships = new Set(database.metadata.championships);

  // Log compression info
  if (database._compressed) {
    console.log(`Loaded compressed database (v${database._version})`);
    console.log('Note: Match stats will be fetched on-demand from API');
  }

  return database;
}
