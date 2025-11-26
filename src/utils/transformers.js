/**
 * Data transformation utilities
 * KISS: Transform FACEIT API data to application format
 */

import { GAME_ID } from '../config/constants';

/**
 * Transform FACEIT team data to application format
 */
export const transformTeamData = (teamDetails, teamStats, memberStats, memberDetails = {}) => {
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
        matches: [], // Will be populated with match details
      };
    }
  });

  // Calculate roster stats
  const roster = (teamDetails.members || []).map((member, idx) => {
    const playerStats = memberStats[member.user_id] || {};
    const playerLifetime = playerStats.lifetime || {};
    const playerData = memberDetails[member.user_id];

    return {
      id: member.user_id,
      name: member.nickname,
      country: member.country,
      skillLevel: playerData?.games?.[GAME_ID]?.skill_level || member.skill_level || 0,
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

/**
 * Transform player stats for detailed view
 */
export const transformPlayerStats = (playerData, statsData) => {
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
