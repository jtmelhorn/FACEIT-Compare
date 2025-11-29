/**
 * Championship Configuration Loader (Browser-Compatible)
 * Loads and parses the championships.yml configuration file
 */

/**
 * Fetch and parse the championships YAML configuration
 * Works in browser by fetching the YAML file
 * @returns {Promise<Object>} Parsed YAML configuration
 */
export async function loadChampionshipsConfig() {
  try {
    // Fetch the YAML file from the public directory
    const response = await fetch('./championships.yml');
    if (!response.ok) {
      throw new Error(`Failed to fetch championships.yml: ${response.statusText}`);
    }

    const yamlText = await response.text();
    const config = parseYAML(yamlText);
    return config;
  } catch (error) {
    throw new Error(`Failed to load championships.yml: ${error.message}`);
  }
}

/**
 * Simple YAML parser for our specific format
 * This handles the specific structure of championships.yml without external dependencies
 * @param {string} yamlText - Raw YAML text
 * @returns {Object} Parsed configuration
 */
function parseYAML(yamlText) {
  const lines = yamlText.split('\n');
  const config = {};
  let currentDivision = null;
  let currentSeason = null;
  let currentRegion = null;
  let indentLevel = 0;

  for (let line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // Count indentation
    const indent = line.search(/\S/);
    const content = line.trim();

    // Organization ID (top level)
    if (content.startsWith('Organization:')) {
      config.Organization = content.split(':')[1].trim();
      continue;
    }

    // Division (no indent after Organization)
    if (indent === 0 && content.endsWith(':')) {
      currentDivision = content.slice(0, -1);
      config[currentDivision] = {};
      currentSeason = null;
      currentRegion = null;
      continue;
    }

    // Season (2 spaces indent)
    if (indent === 2 && content.endsWith(':')) {
      currentSeason = content.slice(0, -1);
      if (currentDivision) {
        config[currentDivision][currentSeason] = {};
      }
      currentRegion = null;
      continue;
    }

    // Region (4 spaces indent)
    if (indent === 4 && content.endsWith(':')) {
      currentRegion = content.slice(0, -1);
      if (currentDivision && currentSeason) {
        config[currentDivision][currentSeason][currentRegion] = [];
      }
      continue;
    }

    // Championship ID (6 spaces indent, starts with -)
    if (indent === 6 && content.startsWith('-')) {
      const id = content.slice(1).trim().split('#')[0].trim();
      if (currentDivision && currentSeason && currentRegion && id) {
        config[currentDivision][currentSeason][currentRegion].push(id);
      }
    }
  }

  return config;
}

/**
 * Extract unique championship IDs for a given division and season
 * Handles deduplication (Central IDs often appear in both East and West)
 *
 * @param {string} division - Division name (e.g., "Open", "Intermediate", "Main", "Advanced")
 * @param {string} season - Season number (e.g., "55", "54")
 * @returns {Promise<Array<string>>} Array of unique championship IDs
 */
export async function getChampionshipIds(division, season) {
  const config = await loadChampionshipsConfig();

  // Validate division exists
  if (!config[division]) {
    throw new Error(
      `Division "${division}" not found in configuration. Available divisions: ${Object.keys(config)
        .filter(k => k !== 'Organization')
        .join(', ')}`
    );
  }

  // Format season key (e.g., "Season55")
  const seasonKey = `Season${season}`;

  // Validate season exists
  if (!config[division][seasonKey]) {
    throw new Error(
      `Season "${season}" not found in division "${division}". Available seasons: ${Object.keys(
        config[division]
      ).join(', ')}`
    );
  }

  const seasonData = config[division][seasonKey];
  const championshipIds = new Set();

  // Collect IDs from all regions (East, West, etc.)
  // Use Set for automatic deduplication
  for (const region in seasonData) {
    if (Array.isArray(seasonData[region])) {
      seasonData[region].forEach(id => championshipIds.add(id));
    }
  }

  return Array.from(championshipIds);
}

/**
 * Get the organization ID from config
 * @returns {Promise<string>} Organization ID
 */
export async function getOrganizationId() {
  const config = await loadChampionshipsConfig();
  return config.Organization;
}

/**
 * Get all available divisions
 * @returns {Promise<Array<string>>} Array of division names
 */
export async function getAvailableDivisions() {
  const config = await loadChampionshipsConfig();
  return Object.keys(config).filter(key => key !== 'Organization');
}

/**
 * Get all available seasons for a division
 * @param {string} division - Division name
 * @returns {Promise<Array<string>>} Array of season numbers (without "Season" prefix)
 */
export async function getAvailableSeasons(division) {
  const config = await loadChampionshipsConfig();

  if (!config[division]) {
    throw new Error(`Division "${division}" not found`);
  }

  return Object.keys(config[division]).map(key => key.replace('Season', ''));
}
