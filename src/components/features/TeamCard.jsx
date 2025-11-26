/**
 * TeamCard Component
 * KISS: Displays team information using shared UI components
 */

import { Tooltip, SkillLevelBadge, RatingBadge, WinRateBar, MatchResult } from '../ui';
import { ALL_MAPS, MAP_DISPLAY_NAMES } from '../../config/constants';

/**
 * Displays comprehensive team information including:
 * - Team header with logo and name
 * - Win/Loss record
 * - Roster with detailed player stats
 * - Recent matches
 * - Map-specific win rates
 */
export const TeamCard = ({ team, side, onRefresh, loading }) => {
  const avgRating = team.roster.length > 0
    ? (team.roster.reduce((sum, p) => sum + p.rating, 0) / team.roster.length).toFixed(2)
    : '1.00';

  const mapEntries = Object.entries(team.mapStats || {});

  return (
    <div className={`team-card ${side}`}>
      {/* Team Header */}
      <div className="team-header">
        <div className="team-logo">
          {team.avatar ? <img src={team.avatar} alt={team.name} /> : '🎮'}
        </div>
        <div className="team-info">
          <div className="team-name-row">
            <h2>{team.name}</h2>
            {onRefresh && (
              <button
                className="refresh-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                title="Refresh team data"
                disabled={loading}
              >
                {loading ? '...' : '↻'}
              </button>
            )}
          </div>
          <span className="team-tag">[{team.tag}]</span>
          <a
            href={`https://www.faceit.com/en/teams/${team.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="faceit-link"
          >
            View on FACEIT ↗
          </a>
        </div>
      </div>

      {/* Team Record */}
      <div className="team-record">
        <div className="record-item wins">
          <span className="record-num">{team.record.wins}</span>
          <span className="record-label">Wins</span>
        </div>
        <div className="record-divider">-</div>
        <div className="record-item losses">
          <span className="record-num">{team.record.losses}</span>
          <span className="record-label">Losses</span>
        </div>
        <div className="record-wr">{team.record.winRate}% WR</div>
      </div>

      {/* Roster Section */}
      <div className="section-title">Roster</div>
      <div className="roster-table">
        <div className="roster-header">
          <span>Player</span>
          <span>Level</span>
          <span>K/D</span>
          <span>HS%</span>
          <span>Win%</span>
        </div>
        {team.roster.map((player) => (
          <Tooltip
            key={player.id}
            content={
              <div className="player-tooltip">
                <div>Matches: {player.matches}</div>
                <div>Wins: {player.wins}</div>
                <div>K/R: {player.kpr}</div>
              </div>
            }
          >
            <div className="roster-row">
              <span className="player-name">
                {player.name}
                {player.role === 'Leader' && <span className="leader-badge">★</span>}
              </span>
              <span><SkillLevelBadge level={player.skillLevel} /></span>
              <span><RatingBadge rating={player.rating} /></span>
              <span>{player.hs}%</span>
              <span>{player.winRate}%</span>
            </div>
          </Tooltip>
        ))}
        <div className="roster-avg">
          <span>Team Average</span>
          <span></span>
          <span><RatingBadge rating={parseFloat(avgRating)} /></span>
          <span>{Math.round(team.roster.reduce((s, p) => s + p.hs, 0) / team.roster.length)}%</span>
          <span>{Math.round(team.roster.reduce((s, p) => s + p.winRate, 0) / team.roster.length)}%</span>
        </div>
      </div>

      {/* Recent Matches Section */}
      {team.recentMatches && team.recentMatches.length > 0 && (
        <>
          <div className="section-title">Recent Matches</div>
          <div className="recent-matches">
            {team.recentMatches.slice(0, 5).map((match, idx) => (
              <div key={idx} className="match-row">
                <MatchResult result={match.result} score={match.score} />
                <span className="match-opponent">vs {match.opponent}</span>
                <span className="match-date">{match.date}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Map Win Rates Section */}
      <div className="section-title">Map Win Rates (Current Pool)</div>
      <div className="map-wr-list">
        {mapEntries.length > 0 ? mapEntries
          .filter(([mapName]) => ALL_MAPS.includes(Object.keys(MAP_DISPLAY_NAMES).find(key => MAP_DISPLAY_NAMES[key] === mapName)))
          .map(([mapName, stats]) => (
            <WinRateBar
              key={mapName}
              wr={stats.wr || 0}
              label={mapName}
              teamColor={side}
              wins={stats.wins || 0}
              losses={stats.losses || 0}
              played={stats.played || 0}
            />
          )) : (
          <div className="no-data">No map data available</div>
        )}
      </div>
    </div>
  );
};
