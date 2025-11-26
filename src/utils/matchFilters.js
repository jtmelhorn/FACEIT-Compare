/**
 * Match filtering utilities
 * KISS: Filter match data based on time and team criteria
 */

import { SIX_MONTHS_MS } from '../config/constants';

/**
 * Filter matches to last 6 months
 */
export const filterLast6Months = (matches) => {
  const sixMonthsAgo = Date.now() - SIX_MONTHS_MS;
  return matches.filter(match => {
    const matchDate = new Date(match.date || match.finished_at * 1000);
    return matchDate.getTime() >= sixMonthsAgo;
  });
};

/**
 * Check if the selected team participated in this match
 * Matches by team name (case-insensitive) to identify team participation
 * The championship filter handles filtering to official matches
 */
export const isTeamParticipant = (playerTeam, officialTeamName) => {
  if (!playerTeam.name || !officialTeamName) return false;
  return playerTeam.name.toLowerCase() === officialTeamName.toLowerCase();
};

/**
 * Format match date for display
 */
export const formatMatchDate = (timestamp) => {
  const date = new Date(timestamp * 1000);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};
