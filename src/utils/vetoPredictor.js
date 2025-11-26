/**
 * Veto prediction logic
 * KISS: Predict map bans/picks based on team statistics
 */

import { ALL_MAPS, MAP_DISPLAY_NAMES } from '../config/constants';

/**
 * Helper: Get team's most common first ban from veto history
 */
const getMostCommonFirstBan = (team, mapList, banned) => {
  if (team.vetoPatterns && Object.keys(team.vetoPatterns.firstBans).length > 0) {
    const bans = team.vetoPatterns.firstBans;
    const sortedBans = Object.entries(bans)
      .sort((a, b) => b[1] - a[1])
      .map(([map]) => map);

    // Find first available map from their common bans
    for (const mapName of sortedBans) {
      const found = mapList.find(m => m.map === mapName && !banned.has(m.map));
      if (found) return found;
    }
  }
  // Fallback to worst map
  return mapList.find(m => !banned.has(m.map));
};

/**
 * Predict veto process for BO1 or BO3 match
 */
export const predictVeto = (teamA, teamB, format = 'BO3') => {
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

  const banned = new Set();
  const picked = [];
  const vetoOrder = [];

  if (format === 'BO1') {
    // BO1 Format: Ban, Ban, Ban, Ban, Ban, Ban, Decider
    const teamABan1 = getMostCommonFirstBan(teamA, teamAWorst, banned);
    if (teamABan1) {
      const reason = teamA.vetoPatterns?.firstBans?.[teamABan1.map]
        ? `Typical first ban (${teamA.vetoPatterns.firstBans[teamABan1.map]}x in history)`
        : `Weakest map (${teamABan1.teamAWr}% WR)`;
      banned.add(teamABan1.map);
      vetoOrder.push({ team: 'A', action: 'ban', map: teamABan1.map, reason });
    }

    const teamBBan1 = getMostCommonFirstBan(teamB, teamBWorst, banned);
    if (teamBBan1) {
      const reason = teamB.vetoPatterns?.firstBans?.[teamBBan1.map]
        ? `Typical first ban (${teamB.vetoPatterns.firstBans[teamBBan1.map]}x in history)`
        : `Weakest map (${teamBBan1.teamBWr}% WR)`;
      banned.add(teamBBan1.map);
      vetoOrder.push({ team: 'B', action: 'ban', map: teamBBan1.map, reason });
    }

    const teamABan2 = teamAWorst.find(m => !banned.has(m.map));
    if (teamABan2) {
      banned.add(teamABan2.map);
      vetoOrder.push({ team: 'A', action: 'ban', map: teamABan2.map, reason: `2nd weakest (${teamABan2.teamAWr}% WR)` });
    }

    const teamBBan2 = teamBWorst.find(m => !banned.has(m.map));
    if (teamBBan2) {
      banned.add(teamBBan2.map);
      vetoOrder.push({ team: 'B', action: 'ban', map: teamBBan2.map, reason: `2nd weakest (${teamBBan2.teamBWr}% WR)` });
    }

    const teamABan3 = teamBBest.find(m => !banned.has(m.map));
    if (teamABan3) {
      banned.add(teamABan3.map);
      vetoOrder.push({ team: 'A', action: 'ban', map: teamABan3.map, reason: `Counter ${teamB.tag}'s strength (${teamABan3.teamBWr}% WR)` });
    }

    const teamBBan3 = teamABest.find(m => !banned.has(m.map));
    if (teamBBan3) {
      banned.add(teamBBan3.map);
      vetoOrder.push({ team: 'B', action: 'ban', map: teamBBan3.map, reason: `Counter ${teamA.tag}'s strength (${teamBBan3.teamAWr}% WR)` });
    }

    const deciderMap = mapDiffs.find(m => !banned.has(m.map));
    if (deciderMap) {
      vetoOrder.push({ team: 'D', action: 'decider', map: deciderMap.map, reason: 'Last remaining map' });
      picked.push(deciderMap.map);
    }
  } else {
    // BO3 Format: Ban, Ban, Pick, Pick, Ban, Ban, Decider
    const teamABan1 = getMostCommonFirstBan(teamA, teamAWorst, banned);
    if (teamABan1) {
      const reason = teamA.vetoPatterns?.firstBans?.[teamABan1.map]
        ? `Typical first ban (${teamA.vetoPatterns.firstBans[teamABan1.map]}x in history)`
        : `Weakest map (${teamABan1.teamAWr}% WR)`;
      banned.add(teamABan1.map);
      vetoOrder.push({ team: 'A', action: 'ban', map: teamABan1.map, reason });
    }

    const teamBBan1 = getMostCommonFirstBan(teamB, teamBWorst, banned);
    if (teamBBan1) {
      const reason = teamB.vetoPatterns?.firstBans?.[teamBBan1.map]
        ? `Typical first ban (${teamB.vetoPatterns.firstBans[teamBBan1.map]}x in history)`
        : `Weakest map (${teamBBan1.teamBWr}% WR)`;
      banned.add(teamBBan1.map);
      vetoOrder.push({ team: 'B', action: 'ban', map: teamBBan1.map, reason });
    }

    const teamAPick = teamABest.find(m => !banned.has(m.map) && !picked.includes(m.map));
    if (teamAPick) {
      picked.push(teamAPick.map);
      vetoOrder.push({ team: 'A', action: 'pick', map: teamAPick.map, reason: `Best map (${teamAPick.teamAWr}% WR)` });
    }

    const teamBPick = teamBBest.find(m => !banned.has(m.map) && !picked.includes(m.map));
    if (teamBPick) {
      picked.push(teamBPick.map);
      vetoOrder.push({ team: 'B', action: 'pick', map: teamBPick.map, reason: `Best map (${teamBPick.teamBWr}% WR)` });
    }

    const teamABan2 = teamBBest.find(m => !banned.has(m.map) && !picked.includes(m.map));
    if (teamABan2) {
      banned.add(teamABan2.map);
      vetoOrder.push({ team: 'A', action: 'ban', map: teamABan2.map, reason: `Counter ${teamB.tag}'s strength (${teamABan2.teamBWr}% WR)` });
    }

    const teamBBan2 = teamABest.find(m => !banned.has(m.map) && !picked.includes(m.map));
    if (teamBBan2) {
      banned.add(teamBBan2.map);
      vetoOrder.push({ team: 'B', action: 'ban', map: teamBBan2.map, reason: `Counter ${teamA.tag}'s strength (${teamBBan2.teamAWr}% WR)` });
    }

    const deciderMap = mapDiffs.find(m => !banned.has(m.map) && !picked.includes(m.map));
    if (deciderMap) {
      vetoOrder.push({ team: 'D', action: 'decider', map: deciderMap.map, reason: 'Last remaining map' });
      picked.push(deciderMap.map);
    }
  }

  // Calculate high difference maps
  const highDiffMaps = mapDiffs
    .map(m => ({ ...m, diff: Math.abs(m.teamAWr - m.teamBWr) }))
    .filter(m => m.diff >= 15)
    .sort((a, b) => b.diff - a.diff);

  return {
    vetoOrder,
    predictedPool: picked,
    highDiffMaps,
    format,
    teamALikelyBan: vetoOrder.find(v => v.team === 'A' && v.action === 'ban')?.map,
    teamBLikelyBan: vetoOrder.find(v => v.team === 'B' && v.action === 'ban')?.map,
    teamALikelyPick: vetoOrder.find(v => v.team === 'A' && v.action === 'pick')?.map,
    teamBLikelyPick: vetoOrder.find(v => v.team === 'B' && v.action === 'pick')?.map,
  };
};
