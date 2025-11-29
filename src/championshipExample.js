/**
 * Championship System - Example Usage
 *
 * This file demonstrates how to use the championship-first system
 * Run this in your browser console or integrate into your app
 */

import { ChampionshipOrchestrator } from './championshipOrchestrator.js';
import {
  searchTeamsByName,
  searchPlayersByName,
  getTeamById,
  getPlayerById,
  getTeamMatches,
  getPlayerMatches
} from './championshipDatabase.js';

// ============================================================================
// EXAMPLE 1: Basic Usage - Fetch and Search
// ============================================================================

export async function example1_BasicUsage() {
  console.log('=== EXAMPLE 1: Basic Usage ===');

  // Create orchestrator
  const orchestrator = new ChampionshipOrchestrator();

  // Fetch Open Season 55 data
  console.log('Fetching Open Season 55...');
  const database = await orchestrator.processChampionships('Open', '55');

  console.log('Database Stats:', database.metadata);
  console.log(`- ${database.metadata.totalTeams} teams`);
  console.log(`- ${database.metadata.totalPlayers} players`);
  console.log(`- ${database.metadata.totalMatches} matches`);

  // Search for a team
  const teams = searchTeamsByName(database, 'test');
  console.log(`Found ${teams.length} teams matching "test":`);
  teams.slice(0, 5).forEach(team => {
    console.log(`  - ${team.teamName} (${team.stats.totalMatches} matches)`);
  });

  return database;
}

// ============================================================================
// EXAMPLE 2: With Progress Tracking
// ============================================================================

export async function example2_WithProgress() {
  console.log('=== EXAMPLE 2: With Progress Tracking ===');

  const orchestrator = new ChampionshipOrchestrator();

  // Set up progress callbacks
  orchestrator.setProgressCallbacks({
    onConfigLoad: (division, season) => {
      console.log(`📋 Loading configuration for ${division} Season ${season}`);
    },
    onChampionshipFetch: (current, total, championshipId) => {
      const percent = Math.round((current / total) * 100);
      console.log(`🏆 Fetching championships: ${current}/${total} (${percent}%)`);
    },
    onMatchStatsFetch: (current, total) => {
      const percent = Math.round((current / total) * 100);
      console.log(`📊 Fetching match stats: ${current}/${total} (${percent}%)`);
    },
    onDatabaseBuild: () => {
      console.log('🔨 Building database...');
    },
    onComplete: (database) => {
      console.log('✅ Complete!', database.metadata);
    }
  });

  // Fetch Intermediate Season 55
  const database = await orchestrator.processChampionships('Intermediate', '55');

  return database;
}

// ============================================================================
// EXAMPLE 3: Using Cache (localStorage)
// ============================================================================

export async function example3_WithCache() {
  console.log('=== EXAMPLE 3: Using Cache ===');

  const orchestrator = new ChampionshipOrchestrator();
  const cacheKey = 'championship_open_s55';

  // Try loading from cache first
  console.log('Checking cache...');
  if (orchestrator.loadFromLocalStorage(cacheKey)) {
    console.log('✅ Loaded from cache!');
    const database = orchestrator.getDatabase();
    console.log('Cached database:', database.metadata);
    return database;
  }

  // Cache miss - fetch fresh data
  console.log('❌ Cache miss. Fetching fresh data...');
  const database = await orchestrator.processChampionships('Open', '55');

  // Save to cache
  console.log('💾 Saving to cache...');
  orchestrator.saveToLocalStorage(cacheKey);

  return database;
}

// ============================================================================
// EXAMPLE 4: Search and Explore
// ============================================================================

export async function example4_SearchAndExplore(database, teamName, playerName) {
  console.log('=== EXAMPLE 4: Search and Explore ===');

  // Search teams
  if (teamName) {
    console.log(`\nSearching teams for: "${teamName}"`);
    const teams = searchTeamsByName(database, teamName);

    if (teams.length === 0) {
      console.log('No teams found');
    } else {
      console.log(`Found ${teams.length} team(s):`);
      teams.forEach(team => {
        console.log(`\n📋 ${team.teamName}`);
        console.log(`   ID: ${team.teamId}`);
        console.log(`   Matches: ${team.matches.length}`);
        console.log(`   Players: ${team.players.length}`);
        console.log(`   Win/Loss: ${team.stats.wins}W - ${team.stats.losses}L`);

        // Get match details
        if (team.matches.length > 0) {
          const matches = getTeamMatches(database, team.teamId);
          console.log(`   Recent matches:`);
          matches.slice(0, 3).forEach(match => {
            const date = new Date(match.finished_at * 1000).toLocaleDateString();
            console.log(`     - ${date}: ${match.teams.faction1?.name} vs ${match.teams.faction2?.name}`);
          });
        }
      });
    }
  }

  // Search players
  if (playerName) {
    console.log(`\nSearching players for: "${playerName}"`);
    const players = searchPlayersByName(database, playerName);

    if (players.length === 0) {
      console.log('No players found');
    } else {
      console.log(`Found ${players.length} player(s):`);
      players.forEach(player => {
        console.log(`\n👤 ${player.playerName}`);
        console.log(`   ID: ${player.playerId}`);
        console.log(`   Teams: ${player.teams.length}`);
        console.log(`   Matches: ${player.matches.length}`);
      });
    }
  }
}

// ============================================================================
// EXAMPLE 5: Download/Upload Database
// ============================================================================

export async function example5_DownloadDatabase() {
  console.log('=== EXAMPLE 5: Download Database ===');

  const orchestrator = new ChampionshipOrchestrator();

  // Fetch data
  console.log('Fetching Main Season 55...');
  await orchestrator.processChampionships('Main', '55');

  // Download as JSON file
  console.log('📥 Downloading database...');
  orchestrator.downloadDatabase('main_s55_database.json');

  console.log('✅ Database downloaded! Check your downloads folder.');
}

export function example5b_UploadDatabase() {
  console.log('=== EXAMPLE 5B: Upload Database ===');
  console.log('Add this to your HTML:');
  console.log('<input type="file" id="db-upload" accept=".json">');
  console.log('\nThen run this in console:');
  console.log(`
const orchestrator = new ChampionshipOrchestrator();
document.getElementById('db-upload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  await orchestrator.uploadDatabase(file);
  console.log('Database uploaded!', orchestrator.getDatabase().metadata);
});
  `);
}

// ============================================================================
// EXAMPLE 6: Compare Multiple Divisions/Seasons
// ============================================================================

export async function example6_CompareSeasons() {
  console.log('=== EXAMPLE 6: Compare Multiple Seasons ===');

  const orchestrator = new ChampionshipOrchestrator();

  // Fetch Open S55 and S54
  console.log('Fetching Open Season 55...');
  const db55 = await orchestrator.processChampionships('Open', '55');

  console.log('Fetching Open Season 54...');
  const db54 = await orchestrator.processChampionships('Open', '54');

  // Compare stats
  console.log('\n📊 Comparison:');
  console.log('Season 55:');
  console.log(`  Teams: ${db55.metadata.totalTeams}`);
  console.log(`  Matches: ${db55.metadata.totalMatches}`);

  console.log('Season 54:');
  console.log(`  Teams: ${db54.metadata.totalTeams}`);
  console.log(`  Matches: ${db54.metadata.totalMatches}`);

  // Find teams that appear in both seasons
  const teams55 = new Set(Array.from(db55.teams.keys()));
  const teams54 = new Set(Array.from(db54.teams.keys()));

  const commonTeams = [...teams55].filter(id => teams54.has(id));
  console.log(`\nTeams in both seasons: ${commonTeams.length}`);

  if (commonTeams.length > 0) {
    console.log('\nExample team progression:');
    const teamId = commonTeams[0];
    const team55 = getTeamById(db55, teamId);
    const team54 = getTeamById(db54, teamId);

    console.log(`${team55.teamName}:`);
    console.log(`  S54: ${team54.matches.length} matches`);
    console.log(`  S55: ${team55.matches.length} matches`);
  }
}

// ============================================================================
// EXAMPLE 7: Export/Import JSON
// ============================================================================

export async function example7_ExportImport() {
  console.log('=== EXAMPLE 7: Export/Import ===');

  const orchestrator = new ChampionshipOrchestrator();

  // Fetch and export
  console.log('Fetching Advanced Season 55...');
  await orchestrator.processChampionships('Advanced', '55');

  // Export to JSON string
  console.log('Exporting to JSON...');
  const json = exportDatabase(orchestrator.getDatabase());

  console.log(`JSON size: ${(json.length / 1024).toFixed(2)} KB`);

  // Import from JSON
  console.log('Re-importing...');
  const newOrchestrator = new ChampionshipOrchestrator();
  const importedDb = importDatabase(json);

  console.log('Imported database:', importedDb.metadata);

  return importedDb;
}

// ============================================================================
// QUICK START FUNCTION
// ============================================================================

/**
 * Quick start: Load database with caching
 * Use this as your main entry point in your app
 */
export async function quickStart(division = 'Open', season = '55', useCache = true) {
  console.log(`🚀 Quick Start: ${division} Season ${season}`);

  const orchestrator = new ChampionshipOrchestrator();
  const cacheKey = `championship_${division.toLowerCase()}_s${season}`;

  // Try cache first
  if (useCache && orchestrator.loadFromLocalStorage(cacheKey)) {
    console.log('✅ Loaded from cache');
    return orchestrator.getDatabase();
  }

  // Fetch fresh
  console.log('Fetching from API...');
  orchestrator.setProgressCallbacks({
    onChampionshipFetch: (current, total) => {
      console.log(`Progress: ${current}/${total} championships`);
    }
  });

  const database = await orchestrator.processChampionships(division, season);

  // Save to cache
  if (useCache) {
    orchestrator.saveToLocalStorage(cacheKey);
  }

  console.log('✅ Ready!', database.metadata);
  return database;
}

// ============================================================================
// USAGE IN BROWSER CONSOLE
// ============================================================================

/*

// Copy these examples to browser console after loading the app:

// 1. Quick start (with cache)
const db = await quickStart('Open', '55');

// 2. Search for teams
const teams = searchTeamsByName(db, 'liquid');
console.log(teams);

// 3. Search for players
const players = searchPlayersByName(db, 'stewie');
console.log(players);

// 4. Get team matches
const teamMatches = getTeamMatches(db, teams[0].teamId);
console.log(teamMatches);

// 5. Run full example with progress
await example2_WithProgress();

// 6. Explore a team
await example4_SearchAndExplore(db, 'my team', 'my player');

*/
