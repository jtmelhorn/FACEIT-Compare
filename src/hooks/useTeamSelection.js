/**
 * useTeamSelection Hook
 * KISS: Manages team selection state with localStorage persistence
 */

import { useState, useEffect } from 'react';
import { STORAGE_KEYS, VIEW_MODES } from '../config/constants';
import { getCachedTeam, setCachedTeam, getViewMode, setViewMode as saveViewMode } from '../utils/storage';

export const useTeamSelection = () => {
  const [teamA, setTeamAState] = useState(null);
  const [teamB, setTeamBState] = useState(null);
  const [viewMode, setViewModeState] = useState(VIEW_MODES.SINGLE);

  // Load cached teams on mount
  useEffect(() => {
    const cachedA = getCachedTeam(STORAGE_KEYS.TEAM_A);
    const cachedB = getCachedTeam(STORAGE_KEYS.TEAM_B);
    const cachedMode = getViewMode() || VIEW_MODES.SINGLE;

    if (cachedA) setTeamAState(cachedA);
    if (cachedB) setTeamBState(cachedB);
    setViewModeState(cachedMode);
  }, []);

  // Cache teamA when it changes
  useEffect(() => {
    if (teamA) {
      setCachedTeam(STORAGE_KEYS.TEAM_A, teamA);
    }
  }, [teamA]);

  // Cache teamB when it changes
  useEffect(() => {
    if (teamB) {
      setCachedTeam(STORAGE_KEYS.TEAM_B, teamB);
    }
  }, [teamB]);

  // Cache view mode when it changes
  useEffect(() => {
    saveViewMode(viewMode);
  }, [viewMode]);

  /**
   * Set Team A
   */
  const setTeamA = (team) => {
    setTeamAState(team);
  };

  /**
   * Set Team B
   */
  const setTeamB = (team) => {
    setTeamBState(team);
  };

  /**
   * Set view mode
   */
  const setViewMode = (mode) => {
    setViewModeState(mode);
  };

  /**
   * Toggle view mode between single and compare
   */
  const toggleViewMode = () => {
    setViewModeState(prev =>
      prev === VIEW_MODES.SINGLE ? VIEW_MODES.COMPARE : VIEW_MODES.SINGLE
    );
  };

  return {
    teamA,
    teamB,
    viewMode,
    setTeamA,
    setTeamB,
    setViewMode,
    toggleViewMode,
  };
};
