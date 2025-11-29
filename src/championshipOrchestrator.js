/**
 * Championship Orchestrator
 * Main entry point that ties together config loading, data fetching, and database building
 */

import { getChampionshipIds } from './championshipConfig.js';
import { fetchAllChampionshipMatches, fetchAllMatchStats } from './championshipFetcher.js';
import { buildDatabase, exportDatabase, importDatabase } from './championshipDatabase.js';

/**
 * Main orchestrator class for championship data processing
 */
export class ChampionshipOrchestrator {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
    this.database = null;
    this.progressCallbacks = {
      onConfigLoad: null,
      onChampionshipFetch: null,
      onMatchStatsFetch: null,
      onDatabaseBuild: null,
      onComplete: null
    };
  }

  /**
   * Set progress callback functions
   * @param {Object} callbacks - Object with callback functions
   */
  setProgressCallbacks(callbacks) {
    this.progressCallbacks = { ...this.progressCallbacks, ...callbacks };
  }

  /**
   * Main workflow: Load config, fetch data, build database
   * @param {string} division - Division name (e.g., "Open", "Intermediate")
   * @param {string} season - Season number (e.g., "55")
   * @param {boolean} fetchDetailedStats - Whether to fetch detailed match stats (slower)
   * @returns {Promise<Object>} Database object
   */
  async processChampionships(division, season, fetchDetailedStats = false) {
    try {
      // Step 1: Load configuration and extract championship IDs
      if (this.progressCallbacks.onConfigLoad) {
        this.progressCallbacks.onConfigLoad(division, season);
      }

      const championshipIds = await getChampionshipIds(division, season);
      console.log(`Found ${championshipIds.length} unique championships for ${division} Season ${season}`);

      // Step 2: Fetch all matches from championships
      if (this.progressCallbacks.onChampionshipFetch) {
        this.progressCallbacks.onChampionshipFetch(0, championshipIds.length);
      }

      const matches = await fetchAllChampionshipMatches(
        championshipIds,
        this.apiKey,
        (current, total, championshipId) => {
          console.log(`Fetching championship ${current}/${total}: ${championshipId}`);
          if (this.progressCallbacks.onChampionshipFetch) {
            this.progressCallbacks.onChampionshipFetch(current, total, championshipId);
          }
        }
      );

      console.log(`Fetched ${matches.length} total matches`);

      // Step 3: Optionally fetch detailed match stats
      let matchStats = [];
      if (fetchDetailedStats && matches.length > 0) {
        const matchIds = matches.map(m => m.match_id).filter(Boolean);

        if (this.progressCallbacks.onMatchStatsFetch) {
          this.progressCallbacks.onMatchStatsFetch(0, matchIds.length);
        }

        matchStats = await fetchAllMatchStats(
          matchIds,
          this.apiKey,
          (current, total, matchId) => {
            console.log(`Fetching match stats ${current}/${total}`);
            if (this.progressCallbacks.onMatchStatsFetch) {
              this.progressCallbacks.onMatchStatsFetch(current, total, matchId);
            }
          }
        );

        console.log(`Fetched ${matchStats.length} detailed match stats`);
      }

      // Step 4: Build database
      if (this.progressCallbacks.onDatabaseBuild) {
        this.progressCallbacks.onDatabaseBuild();
      }

      this.database = buildDatabase(matches, matchStats);

      console.log(`Database built: ${this.database.metadata.totalTeams} teams, ${this.database.metadata.totalPlayers} players, ${this.database.metadata.totalMatches} matches`);

      // Step 5: Complete
      if (this.progressCallbacks.onComplete) {
        this.progressCallbacks.onComplete(this.database);
      }

      return this.database;
    } catch (error) {
      console.error('Error in processChampionships:', error);
      throw error;
    }
  }

  /**
   * Get the current database
   * @returns {Object|null} Database object or null
   */
  getDatabase() {
    return this.database;
  }

  /**
   * Save database to localStorage
   * @param {string} key - LocalStorage key (default: 'championship_database')
   */
  saveToLocalStorage(key = 'championship_database') {
    if (!this.database) {
      throw new Error('No database to save. Run processChampionships first.');
    }

    const json = exportDatabase(this.database);

    try {
      localStorage.setItem(key, json);
      console.log('Database saved to localStorage');
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded. Use downloadDatabase() to save to file instead.');
        throw new Error('localStorage quota exceeded. Database is too large for localStorage. Use downloadDatabase() method to save to a file.');
      }
      throw error;
    }
  }

  /**
   * Load database from localStorage
   * @param {string} key - LocalStorage key (default: 'championship_database')
   * @returns {boolean} True if loaded successfully
   */
  loadFromLocalStorage(key = 'championship_database') {
    const json = localStorage.getItem(key);
    if (!json) {
      console.warn('No database found in localStorage');
      return false;
    }

    this.database = importDatabase(json);
    console.log('Database loaded from localStorage');
    return true;
  }

  /**
   * Clear database from localStorage
   * @param {string} key - LocalStorage key (default: 'championship_database')
   */
  clearLocalStorage(key = 'championship_database') {
    localStorage.removeItem(key);
    console.log('Database cleared from localStorage');
  }

  /**
   * Download database as JSON file
   * @param {string} filename - Filename (default: 'championship_database.json')
   * @param {boolean} compress - If true, use compressed format (default: false for downloads)
   */
  downloadDatabase(filename = 'championship_database.json', compress = false) {
    if (!this.database) {
      throw new Error('No database to download. Run processChampionships first.');
    }

    const json = exportDatabase(this.database, compress);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
    console.log(`Database downloaded (${compress ? 'compressed' : 'full'} format)`);
  }

  /**
   * Upload and import database from JSON file
   * @param {File} file - JSON file object
   * @returns {Promise<boolean>} True if imported successfully
   */
  async uploadDatabase(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const json = e.target.result;
          this.database = importDatabase(json);
          console.log('Database imported from file');
          console.log(`Loaded: ${this.database.metadata.totalTeams} teams, ${this.database.metadata.totalPlayers} players, ${this.database.metadata.totalMatches} matches`);
          resolve(true);
        } catch (error) {
          console.error('Failed to import database:', error);
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Load database from a file input element
   * Convenience method for loading from file picker
   * @returns {Promise<void>}
   */
  async loadFromFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }

        try {
          await this.uploadDatabase(file);
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      input.click();
    });
  }
}

/**
 * Quick function to fetch and build database in one call
 * @param {string} division - Division name
 * @param {string} season - Season number
 * @param {string} apiKey - FACEIT API key (optional)
 * @param {boolean} fetchDetailedStats - Whether to fetch detailed stats
 * @param {Object} progressCallbacks - Progress callback functions
 * @returns {Promise<Object>} Database object
 */
export async function fetchChampionshipDatabase(
  division,
  season,
  apiKey = null,
  fetchDetailedStats = false,
  progressCallbacks = {}
) {
  const orchestrator = new ChampionshipOrchestrator(apiKey);
  orchestrator.setProgressCallbacks(progressCallbacks);
  return await orchestrator.processChampionships(division, season, fetchDetailedStats);
}
