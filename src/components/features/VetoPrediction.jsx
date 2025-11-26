/**
 * Veto Prediction Components
 * KISS: Displays veto predictions and timeline
 */

import { Tooltip } from '../ui';

// ============================================================================
// VETO TIMELINE COMPONENT
// ============================================================================
export const VetoTimeline = ({ vetoOrder, teamA, teamB }) => (
  <div className="veto-timeline">
    <div className="timeline-track">
      {vetoOrder.map((step, idx) => (
        <Tooltip
          key={idx}
          content={
            <div className="veto-tooltip">
              <div className="veto-reason">{step.reason}</div>
              {step.team !== 'D' && (
                <div className="veto-team">
                  {step.team === 'A' ? teamA.name : teamB.name}
                </div>
              )}
            </div>
          }
        >
          <div className={`timeline-step ${step.action} team-${step.team.toLowerCase()}`}>
            <div className="step-number">{idx + 1}</div>
            <div className="step-action">{step.action.toUpperCase()}</div>
            <div className="step-map">{step.map}</div>
            <div className="step-team">
              {step.team === 'A' ? teamA.tag : step.team === 'B' ? teamB.tag : '?'}
            </div>
          </div>
        </Tooltip>
      ))}
    </div>
    <div className="timeline-legend">
      <span className="legend-item ban">Ban</span>
      <span className="legend-item pick">Pick</span>
      <span className="legend-item decider">Decider</span>
    </div>
  </div>
);

// ============================================================================
// VETO PREDICTION COMPONENT
// ============================================================================
export const VetoPrediction = ({ prediction, teamA, teamB }) => (
  <div className="veto-prediction">
    <div className="prediction-summary">
      <div className="prediction-card team-a">
        <div className="pred-team">{teamA.tag}</div>
        <div className="pred-items">
          <div className="pred-item">
            <span className="pred-label">Likely Ban</span>
            <span className="pred-map ban">{prediction.teamALikelyBan || 'N/A'}</span>
          </div>
          <div className="pred-item">
            <span className="pred-label">Likely Pick</span>
            <span className="pred-map pick">{prediction.teamALikelyPick || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="vs-badge">VS</div>

      <div className="prediction-card team-b">
        <div className="pred-team">{teamB.tag}</div>
        <div className="pred-items">
          <div className="pred-item">
            <span className="pred-label">Likely Ban</span>
            <span className="pred-map ban">{prediction.teamBLikelyBan || 'N/A'}</span>
          </div>
          <div className="pred-item">
            <span className="pred-label">Likely Pick</span>
            <span className="pred-map pick">{prediction.teamBLikelyPick || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>

    {prediction.highDiffMaps && prediction.highDiffMaps.length > 0 && (
      <div className="high-diff-section">
        <div className="section-title">High Winrate Difference Maps (≥15%)</div>
        <div className="high-diff-maps">
          {prediction.highDiffMaps.map((m, idx) => (
            <div key={idx} className="diff-map-card">
              <div className="diff-map-name">{m.map}</div>
              <div className="diff-bars">
                <div className="diff-team">
                  <span>{teamA.tag}</span>
                  <span className={m.teamAWr > m.teamBWr ? 'higher' : ''}>{m.teamAWr}%</span>
                </div>
                <div className="diff-indicator">
                  <span className="diff-value">Δ {m.diff}%</span>
                </div>
                <div className="diff-team">
                  <span>{teamB.tag}</span>
                  <span className={m.teamBWr > m.teamAWr ? 'higher' : ''}>{m.teamBWr}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="predicted-pool">
      <div className="section-title">Predicted Map Pool</div>
      <div className="pool-maps">
        {prediction.predictedPool.map((map, idx) => (
          <div key={map} className={`pool-map ${idx === 2 ? 'decider' : ''}`}>
            <span className="pool-map-num">Map {idx + 1}</span>
            <span className="pool-map-name">{map}</span>
            {idx === 2 && <span className="pool-map-tag">Decider</span>}
          </div>
        ))}
      </div>
    </div>
  </div>
);
