/**
 * Map Statistics Dashboard
 * KISS: Shows map-specific stats and match history
 * Supports both single team view and comparison mode
 */

import { useState } from 'react';
import { MatchResult } from '../ui';
import { MAP_DISPLAY_NAMES } from '../../config/constants';

/**
 * Props:
 * - teamA: Primary team data with mapStats
 * - teamB: Optional secondary team for comparison mode
 * - singleMode: Boolean to determine layout (single vs compare)
 */
export const MapStatsDashboard = ({ teamA, teamB, singleMode }) => {
  const [selectedMap, setSelectedMap] = useState('Mirage');

  const mapDataA = teamA.mapStats[selectedMap] || { wr: 50, played: 0, matches: [] };
  const mapDataB = teamB ? (teamB.mapStats[selectedMap] || { wr: 50, played: 0, matches: [] }) : null;

  const availableMaps = [...new Set([
    ...Object.keys(teamA.mapStats || {}),
    ...(teamB ? Object.keys(teamB.mapStats || {}) : [])
  ])];

  return (
    <div className="map-stats-dashboard">
      <div className="map-tabs">
        {availableMaps.map(map => (
          <button
            key={map}
            className={`map-tab ${selectedMap === map ? 'active' : ''}`}
            onClick={() => setSelectedMap(map)}
          >
            {map}
          </button>
        ))}
      </div>

      {singleMode ? (
        /* Single Team View */
        <div className="map-single-view">
          <div className="map-team-stats">
            <div className="map-team-header">
              <span className="team-indicator team-a">{teamA.tag}</span>
            </div>
            <div className="stat-grid">
              <div className="stat-item">
                <span className="stat-value large">{mapDataA.wr}%</span>
                <span className="stat-label">Win Rate</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{mapDataA.played}</span>
                <span className="stat-label">Maps Played</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{mapDataA.wins || 0}</span>
                <span className="stat-label">Wins</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{mapDataA.losses || 0}</span>
                <span className="stat-label">Losses</span>
              </div>
            </div>
          </div>

          {/* Match List for Single Team */}
          <div className="map-matches-single">
            <h3>{teamA.tag} Matches on {selectedMap}</h3>
            {mapDataA.matches && mapDataA.matches.length > 0 ? (
              <div className="match-list">
                {mapDataA.matches.map((match, idx) => (
                  <div key={idx} className="match-item">
                    <div className="match-main-info">
                      <MatchResult result={match.result} score={match.score} />
                      <span className="match-opponent">vs {match.opponent}</span>
                      <span className="match-date">{match.date}</span>
                      <a
                        href={`https://www.faceit.com/en/cs2/room/${match.matchId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="match-link"
                      >
                        View Match ↗
                      </a>
                    </div>
                    {match.vetoes && (match.vetoes.picks.length > 0 || match.vetoes.bans.length > 0) && (
                      <div className="match-vetoes">
                        {match.vetoes.picks.length > 0 && (
                          <div className="veto-section">
                            <span className="veto-label">Picks:</span>
                            <span className="veto-maps">{match.vetoes.picks.map(m => MAP_DISPLAY_NAMES[m] || m).join(', ')}</span>
                          </div>
                        )}
                        {match.vetoes.bans.length > 0 && (
                          <div className="veto-section">
                            <span className="veto-label">Bans:</span>
                            <span className="veto-maps">{match.vetoes.bans.map(m => MAP_DISPLAY_NAMES[m] || m).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-matches">No match data available for this map</p>
            )}
          </div>
        </div>
      ) : (
        /* Compare Mode */
        <>
          <div className="map-comparison">
            <div className="map-team-stats team-a-stats">
              <div className="map-team-header">
                <span className="team-indicator team-a">{teamA.tag}</span>
              </div>
              <div className="stat-grid">
                <div className="stat-item">
                  <span className="stat-value large">{mapDataA.wr}%</span>
                  <span className="stat-label">Win Rate</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{mapDataA.played}</span>
                  <span className="stat-label">Maps Played</span>
                </div>
              </div>
            </div>

            <div className="map-visual">
              <div className="map-icon">{selectedMap.toUpperCase()}</div>
              <div className="wr-comparison">
                <div className="wr-compare-bar">
                  <div
                    className="wr-fill team-a"
                    style={{ width: `${(mapDataA.wr / (mapDataA.wr + mapDataB.wr)) * 100}%` }}
                  >
                    {mapDataA.wr}%
                  </div>
                  <div
                    className="wr-fill team-b"
                    style={{ width: `${(mapDataB.wr / (mapDataA.wr + mapDataB.wr)) * 100}%` }}
                  >
                    {mapDataB.wr}%
                  </div>
                </div>
              </div>
            </div>

            <div className="map-team-stats team-b-stats">
              <div className="map-team-header">
                <span className="team-indicator team-b">{teamB.tag}</span>
              </div>
              <div className="stat-grid">
                <div className="stat-item">
                  <span className="stat-value large">{mapDataB.wr}%</span>
                  <span className="stat-label">Win Rate</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{mapDataB.played}</span>
                  <span className="stat-label">Maps Played</span>
                </div>
              </div>
            </div>
          </div>

          {/* Match Lists */}
          <div className="map-matches-container">
            <div className="map-matches team-a-matches">
              <h3>{teamA.tag} Matches on {selectedMap}</h3>
              {mapDataA.matches && mapDataA.matches.length > 0 ? (
                <div className="match-list">
                  {mapDataA.matches.map((match, idx) => (
                    <div key={idx} className="match-item">
                      <div className="match-main-info">
                        <MatchResult result={match.result} score={match.score} />
                        <span className="match-opponent">vs {match.opponent}</span>
                        <span className="match-date">{match.date}</span>
                        <a
                          href={`https://www.faceit.com/en/cs2/room/${match.matchId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="match-link"
                        >
                          View Match ↗
                        </a>
                      </div>
                      {match.vetoes && (match.vetoes.picks.length > 0 || match.vetoes.bans.length > 0) && (
                        <div className="match-vetoes">
                          {match.vetoes.picks.length > 0 && (
                            <div className="veto-section">
                              <span className="veto-label">Picks:</span>
                              <span className="veto-maps">{match.vetoes.picks.map(m => MAP_DISPLAY_NAMES[m] || m).join(', ')}</span>
                            </div>
                          )}
                          {match.vetoes.bans.length > 0 && (
                            <div className="veto-section">
                              <span className="veto-label">Bans:</span>
                              <span className="veto-maps">{match.vetoes.bans.map(m => MAP_DISPLAY_NAMES[m] || m).join(', ')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-matches">No match data available for this map</p>
              )}
            </div>

            <div className="map-matches team-b-matches">
              <h3>{teamB.tag} Matches on {selectedMap}</h3>
              {mapDataB.matches && mapDataB.matches.length > 0 ? (
                <div className="match-list">
                  {mapDataB.matches.map((match, idx) => (
                    <div key={idx} className="match-item">
                      <div className="match-main-info">
                        <MatchResult result={match.result} score={match.score} />
                        <span className="match-opponent">vs {match.opponent}</span>
                        <span className="match-date">{match.date}</span>
                        <a
                          href={`https://www.faceit.com/en/cs2/room/${match.matchId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="match-link"
                        >
                          View Match ↗
                        </a>
                      </div>
                      {match.vetoes && (match.vetoes.picks.length > 0 || match.vetoes.bans.length > 0) && (
                        <div className="match-vetoes">
                          {match.vetoes.picks.length > 0 && (
                            <div className="veto-section">
                              <span className="veto-label">Picks:</span>
                              <span className="veto-maps">{match.vetoes.picks.map(m => MAP_DISPLAY_NAMES[m] || m).join(', ')}</span>
                            </div>
                          )}
                          {match.vetoes.bans.length > 0 && (
                            <div className="veto-section">
                              <span className="veto-label">Bans:</span>
                              <span className="veto-maps">{match.vetoes.bans.map(m => MAP_DISPLAY_NAMES[m] || m).join(', ')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-matches">No match data available for this map</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
