/**
 * Championship Data Fetcher
 * Fetches all matches from FACEIT championships using the Data API v4
 */

const FACEIT_API_BASE = 'https://open.faceit.com/data/v4';

/**
 * Fetch all matches from a single championship with pagination
 * Uses binary search to find the exact total count
 * @param {string} championshipId - Championship ID
 * @param {string} apiKey - FACEIT API key (optional, may work without for some endpoints)
 * @returns {Promise<Array>} Array of match objects
 */
export async function fetchChampionshipMatches(championshipId, apiKey = null) {
  const headers = apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {};

  try {
    // First, find the EXACT total number of matches using binary search
    const totalMatches = await findExactMatchCount(championshipId, headers);
    console.log(`Championship ${championshipId} - Exact total: ${totalMatches} matches`);

    if (totalMatches === 0) {
      return [];
    }

    // Now fetch all matches with the exact count
    const allMatches = [];
    const batchSize = 100;

    for (let offset = 0; offset < totalMatches; offset += batchSize) {
      const limit = Math.min(batchSize, totalMatches - offset);
      const url = `${FACEIT_API_BASE}/championships/${championshipId}/matches?limit=${limit}&offset=${offset}`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const items = data.items || [];
      allMatches.push(...items);
    }

    console.log(`Fetched ${allMatches.length} total matches from championship ${championshipId}`);
    return allMatches;

  } catch (error) {
    console.error(`Failed to fetch matches for championship ${championshipId}:`, error);
    return [];
  }
}

/**
 * Find the exact number of matches using binary search
 * @param {string} championshipId - Championship ID
 * @param {Object} headers - Request headers
 * @returns {Promise<number>} Exact number of matches
 */
async function findExactMatchCount(championshipId, headers) {
  let low = 0;
  let high = 10000;
  let exactCount = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const url = `${FACEIT_API_BASE}/championships/${championshipId}/matches?limit=1&offset=${mid}`;

    try {
      const response = await fetch(url, { headers });

      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          // Match exists at this offset
          exactCount = mid + 1; // At least mid+1 matches exist
          low = mid + 1;
        } else {
          // No match at this offset
          high = mid - 1;
        }
      } else if (response.status === 400) {
        // Offset too high
        high = mid - 1;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn(`Binary search error at offset ${mid}:`, error);
      high = mid - 1;
    }
  }

  return exactCount;
}

/**
 * Fetch detailed match statistics for a single match
 * @param {string} matchId - Match ID
 * @param {string} apiKey - FACEIT API key (optional)
 * @returns {Promise<Object|null>} Match statistics object or null if failed
 */
export async function fetchMatchStats(matchId, apiKey = null) {
  const url = `${FACEIT_API_BASE}/matches/${matchId}/stats`;
  const headers = apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {};

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Match ${matchId} stats not found (404)`);
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to fetch stats for match ${matchId}:`, error);
    return null;
  }
}

/**
 * Fetch all matches from multiple championships with progress tracking
 * @param {Array<string>} championshipIds - Array of championship IDs
 * @param {string} apiKey - FACEIT API key (optional)
 * @param {Function} onProgress - Progress callback (current, total, championshipId)
 * @returns {Promise<Array>} Array of all matches
 */
export async function fetchAllChampionshipMatches(championshipIds, apiKey = null, onProgress = null) {
  const allMatches = [];
  const total = championshipIds.length;

  for (let i = 0; i < championshipIds.length; i++) {
    const championshipId = championshipIds[i];

    if (onProgress) {
      onProgress(i + 1, total, championshipId);
    }

    const matches = await fetchChampionshipMatches(championshipId, apiKey);
    allMatches.push(...matches);
  }

  return allMatches;
}

/**
 * Fetch detailed stats for multiple matches with progress tracking
 * @param {Array<string>} matchIds - Array of match IDs
 * @param {string} apiKey - FACEIT API key (optional)
 * @param {Function} onProgress - Progress callback (current, total, matchId)
 * @returns {Promise<Array>} Array of match stats (nulls filtered out)
 */
export async function fetchAllMatchStats(matchIds, apiKey = null, onProgress = null) {
  const allStats = [];
  const total = matchIds.length;

  for (let i = 0; i < matchIds.length; i++) {
    const matchId = matchIds[i];

    if (onProgress) {
      onProgress(i + 1, total, matchId);
    }

    const stats = await fetchMatchStats(matchId, apiKey);
    if (stats) {
      allStats.push(stats);
    }
  }

  return allStats;
}

/**
 * Fetch championship details (metadata)
 * @param {string} championshipId - Championship ID
 * @param {string} apiKey - FACEIT API key (optional)
 * @returns {Promise<Object|null>} Championship details or null
 */
export async function fetchChampionshipDetails(championshipId, apiKey = null) {
  const url = `${FACEIT_API_BASE}/championships/${championshipId}`;
  const headers = apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {};

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Championship ${championshipId} details not found (404)`);
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to fetch details for championship ${championshipId}:`, error);
    return null;
  }
}

/**
 * Batch fetch with concurrency limit
 * Fetches items in parallel with a max concurrency limit
 * @param {Array} items - Items to fetch
 * @param {Function} fetchFn - Async function to fetch each item
 * @param {number} concurrency - Max concurrent requests (default: 5)
 * @param {Function} onProgress - Progress callback (current, total, item)
 * @returns {Promise<Array>} Results array
 */
export async function batchFetch(items, fetchFn, concurrency = 5, onProgress = null) {
  const results = [];
  const total = items.length;
  let completed = 0;

  // Process in chunks
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkPromises = chunk.map(item => fetchFn(item));
    const chunkResults = await Promise.all(chunkPromises);

    results.push(...chunkResults);
    completed += chunk.length;

    if (onProgress) {
      onProgress(completed, total, null);
    }
  }

  return results;
}
