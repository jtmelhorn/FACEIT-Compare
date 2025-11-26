/**
 * useTeamData Hook
 * KISS: Fetches and transforms team data with match history
 */

import { useCallback, useState } from 'react';
import { transformTeamData } from '../utils/transformers';
import { isTeamParticipant, formatMatchDate } from '../utils/matchFilters';
import { MAP_DISPLAY_NAMES, SIX_MONTHS_MS } from '../config/constants';

export const useTeamData = (api) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch complete team data including stats and match history
   * @param {string} teamId - Team ID to fetch
   * @param {string} filter - Filter type (e.g., 'S50', 'S51')
   */
  const fetchTeamData = useCallback(async (teamId, filter = 'S55') => {
    if (!api || !teamId) return null;

    setLoading(true);
    setError(null);

    try {
      // Fetch team details and stats in parallel
      const [teamDetails, teamStats] = await Promise.all([
        api.getTeam(teamId),
        api.getTeamStats(teamId)
      ]);

      // Fetch member stats in parallel
      const memberStatsPromises = teamDetails.members.map(member =>
        api.getPlayerStats(member.user_id).catch(() => ({}))
      );
      const memberStatsResults = await Promise.all(memberStatsPromises);
      const memberStats = {};
      teamDetails.members.forEach((member, idx) => {
        memberStats[member.user_id] = memberStatsResults[idx];
      });

      // Fetch member details for skill levels
      const memberDetailsPromises = teamDetails.members.map(member =>
        api.getPlayer(member.user_id).catch(() => ({}))
      );
      const memberDetailsResults = await Promise.all(memberDetailsPromises);
      const memberDetails = {};
      teamDetails.members.forEach((member, idx) => {
        memberDetails[member.user_id] = memberDetailsResults[idx];
      });

      // Transform team data
      const transformedTeam = transformTeamData(teamDetails, teamStats, memberStats, memberDetails);

      // Fetch match history from ALL team members to get comprehensive match data
      if (teamDetails.members && teamDetails.members.length > 0) {
        // Fetch match history for each team member
        const memberHistoryPromises = teamDetails.members.map(async (member) => {
          try {
            const history = await api.getPlayerHistory(member.user_id, 100);
            return history.items || [];
          } catch (err) {
            console.warn(`Failed to fetch history for member ${member.user_id}:`, err);
            return [];
          }
        });

        const allMemberHistories = await Promise.all(memberHistoryPromises);

        // Combine and deduplicate matches from all members
        const seenMatchIds = new Set();
        const allMatches = [];
        allMemberHistories.forEach(memberMatches => {
          memberMatches.forEach(match => {
            if (!seenMatchIds.has(match.match_id)) {
              seenMatchIds.add(match.match_id);
              allMatches.push(match);
            }
          });
        });

        console.log(`Found ${allMatches.length} unique matches across all team members`);
        console.log('Filter value:', filter);

        // Filter matches based on Championship (e.g., "S50", "S55")
        // We look for the specific season string in the competition_name
        const recentMatches = allMatches.filter(m => {
          const compName = m.competition_name || '';
          return compName.includes(filter);
        });

        console.log(`Filtered to ${recentMatches.length} matches for ${filter}`);

        // Process matches with throttling to avoid API rate limits
        const throttleRequests = async (items, fn, delayMs = 100) => {
          const results = [];
          for (const item of items) {
            results.push(await fn(item));
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          return results;
        };

        const processedMatches = await throttleRequests(recentMatches, async (match) => {
          try {
            console.log(`Fetching match stats for match ID: ${match.match_id}`);
            const matchStats = await api.getMatchStats(match.match_id);
            console.log(`✅ Successfully fetched match ${match.match_id}`);
            const rounds = matchStats.rounds || [];
            if (rounds.length === 0) {
              console.log(`⚠️ Match ${match.match_id} has no rounds data`);
              return null;
            }

            const round = rounds[0];
            const mapRaw = round.round_stats?.Map || '';
            const mapName = MAP_DISPLAY_NAMES[mapRaw] || mapRaw;

            // Find which team our players played for (check all team members)
            const teams = matchStats.teams || [];
            const teamMemberIds = teamDetails.members.map(m => m.user_id);
            const playerTeam = teams.find(t =>
              t.players?.some(p => teamMemberIds.includes(p.player_id))
            );

            if (!playerTeam) return null;

            // Check if the selected team participated in this match (by team name)
            if (!isTeamParticipant(playerTeam, teamDetails.name)) {
              return null;
            }

            // Determine opponent and result
            const opponentTeam = teams.find(t => t.team_id !== playerTeam.team_id);
            const result = playerTeam.team_stats?.['Team Win'] === '1' ? 'W' : 'L';
            const score = `${playerTeam.team_stats?.['Final Score'] || 0}-${opponentTeam?.team_stats?.['Final Score'] || 0}`;

            const matchData = {
              matchId: match.match_id,
              map: mapName,
              result,
              score,
              date: formatMatchDate(match.finished_at),
              opponent: opponentTeam?.name || 'Unknown',
            };

            // Add to map stats
            if (transformedTeam.mapStats[mapName]) {
              transformedTeam.mapStats[mapName].matches.push(matchData);
            }

            return matchData;
          } catch (err) {
            // Log all errors for debugging
            if (err.status === 404) {
              console.log(`❌ 404: Match ${match.match_id} not found (may be old/deleted)`);
            } else {
              console.warn(`❌ Failed to fetch match ${match.match_id}:`, err.message, err);
            }
            return null;
          }
        });

        // Store recent matches
        transformedTeam.recentMatches = processedMatches.filter(Boolean).slice(0, 10);
      }

      setLoading(false);
      return transformedTeam;

    } catch (err) {
      console.error('Error fetching team data:', err);
      setError(err.message);
      setLoading(false);
      return null;
    }
  }, [api]);

  return { fetchTeamData, loading, error };
};
