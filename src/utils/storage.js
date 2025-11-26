/**
 * LocalStorage utilities
 * KISS: Simple get/set/remove for localStorage with error handling
 */

import { STORAGE_KEYS } from '../config/constants';

/**
 * Get item from localStorage
 */
export const getStorageItem = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (err) {
    console.warn(`Failed to get ${key} from localStorage:`, err);
    return null;
  }
};

/**
 * Set item in localStorage
 */
export const setStorageItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to set ${key} in localStorage:`, err);
  }
};

/**
 * Remove item from localStorage
 */
export const removeStorageItem = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`Failed to remove ${key} from localStorage:`, err);
  }
};

/**
 * Get API key from storage
 */
export const getApiKey = () => getStorageItem(STORAGE_KEYS.API_KEY);

/**
 * Set API key in storage
 */
export const setApiKey = (key) => setStorageItem(STORAGE_KEYS.API_KEY, key);

/**
 * Get cached team data
 */
export const getCachedTeam = (teamKey) => getStorageItem(teamKey);

/**
 * Set cached team data
 */
export const setCachedTeam = (teamKey, teamData) => setStorageItem(teamKey, teamData);

/**
 * Get view mode
 */
export const getViewMode = () => getStorageItem(STORAGE_KEYS.VIEW_MODE);

/**
 * Set view mode
 */
export const setViewMode = (mode) => setStorageItem(STORAGE_KEYS.VIEW_MODE, mode);
