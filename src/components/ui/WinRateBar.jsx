/**
 * Win rate visualization bar
 * KISS: Shows win rate as progress bar with stats
 */

export const WinRateBar = ({ wr, label, teamColor, wins, losses, played }) => (
  <div className="wr-bar-container">
    <div className="wr-bar-label">{label}</div>
    <div className="wr-bar-track">
      <div className={`wr-bar-fill ${teamColor}`} style={{ width: `${wr}%` }} />
    </div>
    <div className="wr-bar-stats">
      <span className="wr-record">{wins}W - {losses}L</span>
      <span className="wr-value">{wr}%</span>
    </div>
  </div>
);
