/**
 * FACEIT API Service
 * KISS: Clean API abstraction, single responsibility
 * Handles all communication with FACEIT Data API v4
 */

import { FACEIT_API_BASE, GAME_ID } from '../config/constants';

/**
 * Create FACEIT API client with authentication
 * @param {string} apiKey - FACEIT API key from https://developers.faceit.com
 * @returns {Object} API client methods
 */
export const createFaceitAPI = (apiKey) => {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  return {
    /**
     * Verify API key is valid
     * Uses lightweight /games endpoint for quick validation
     */
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

    /**
     * Search for teams by name
     */
    searchTeams: async (nickname, limit = 20) => {
      const response = await fetch(
        `${FACEIT_API_BASE}/search/teams?nickname=${encodeURIComponent(nickname)}&game=${GAME_ID}&limit=${limit}`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to search teams');
      return response.json();
    },

    /**
     * Get team details by ID
     */
    getTeam: async (teamId) => {
      const response = await fetch(
        `${FACEIT_API_BASE}/teams/${teamId}`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get team');
      return response.json();
    },

    /**
     * Get team statistics
     */
    getTeamStats: async (teamId) => {
      const response = await fetch(
        `${FACEIT_API_BASE}/teams/${teamId}/stats/${GAME_ID}`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get team stats');
      return response.json();
    },

    /**
     * Get player details by ID
     */
    getPlayer: async (playerId) => {
      const response = await fetch(
        `${FACEIT_API_BASE}/players/${playerId}`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get player');
      return response.json();
    },

    /**
     * Get player statistics
     */
    getPlayerStats: async (playerId) => {
      const response = await fetch(
        `${FACEIT_API_BASE}/players/${playerId}/stats/${GAME_ID}`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get player stats');
      return response.json();
    },

    /**
     * Get player match history
     */
    getPlayerHistory: async (playerId, limit = 20) => { // Reduced limit from 100 to 20
      const response = await fetch(
        `${FACEIT_API_BASE}/players/${playerId}/history?game=${GAME_ID}&limit=${limit}`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get player history');
      return response.json();
    },

    /**
     * Get match statistics by ID
     */
    getMatchStats: async (matchId) => {
      // Strip '1-' prefix if present (common in some FACEIT IDs but not accepted by stats endpoint)
      const cleanMatchId = matchId.replace(/^1-/, '');
      const url = `${FACEIT_API_BASE}/matches/${cleanMatchId}/stats`;
      console.log(`🌐 API Call: GET ${url}`);
      const response = await fetch(url, { headers });
      console.log(`📡 Response: ${response.status} ${response.statusText}`);
      if (!response.ok) {
        const error = new Error('Failed to get match stats');
        error.status = response.status;
        throw error;
      }
      return response.json();
    },

    /**
     * Get match details by ID
     */
    getMatch: async (matchId) => {
      const response = await fetch(
        `${FACEIT_API_BASE}/matches/${matchId}`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to get match');
      return response.json();
    },
  };
};
