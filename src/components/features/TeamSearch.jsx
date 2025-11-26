/**
 * Team Search Component
 * KISS: Autocomplete search with caching and debouncing
 */

import { useState, useCallback, useEffect } from 'react';

export const TeamSearch = ({ label, onSelect, selectedTeam, excludeId, api }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = useCallback(async (searchQuery) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);

    try {
      if (api) {
        // Check cache first (5 minute expiry for search results)
        const cacheKey = `search_${searchQuery.toLowerCase()}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;

          if (age < 5 * 60 * 1000) { // 5 minutes
            console.log(`Using cached search results for "${searchQuery}"`);
            setResults(data);
            setIsSearching(false);
            return;
          } else {
            localStorage.removeItem(cacheKey);
          }
        }

        // Cache miss - fetch from API
        const response = await api.searchTeams(searchQuery, 20);
        const teams = response.items || [];
        const searchResults = teams.map(team => ({
          id: team.team_id,
          name: team.name,
          tag: team.nickname,
          avatar: team.avatar,
        }));

        // Cache the results
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            data: searchResults,
            timestamp: Date.now()
          }));
        } catch (err) {
          console.warn('Failed to cache search results:', err);
        }

        setResults(searchResults);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    }

    setIsSearching(false);
  }, [api]);

  useEffect(() => {
    const timeout = setTimeout(() => handleSearch(query), 300);
    return () => clearTimeout(timeout);
  }, [query, handleSearch]);

  return (
    <div className="team-search">
      <label>{label}</label>
      <div className="search-input-wrapper">
        <input
          type="text"
          placeholder="Search team name..."
          value={selectedTeam ? selectedTeam.name : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
            if (selectedTeam) onSelect(null);
          }}
          onFocus={() => setShowDropdown(true)}
        />
        {selectedTeam && (
          <button className="clear-btn" onClick={() => { onSelect(null); setQuery(''); }}>×</button>
        )}
      </div>
      {showDropdown && !selectedTeam && (
        <div className="search-dropdown">
          {isSearching ? (
            <div className="search-loading">Searching...</div>
          ) : results.length > 0 ? (
            results.filter(t => t.id !== excludeId).map(team => (
              <div
                key={team.id}
                className="search-result"
                onClick={() => { onSelect(team); setShowDropdown(false); }}
              >
                <span className="result-name">{team.name}</span>
                <span className="result-tag">[{team.tag}]</span>
              </div>
            ))
          ) : query.length >= 2 ? (
            <div className="no-results">No teams found</div>
          ) : (
            <div className="search-hint">Type at least 2 characters</div>
          )}
        </div>
      )}
    </div>
  );
};
