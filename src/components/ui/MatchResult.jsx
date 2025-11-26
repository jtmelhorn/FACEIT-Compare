/**
 * Match result display (W/L with score)
 * KISS: Simple win/loss indicator
 */

export const MatchResult = ({ result, score }) => (
  <div className={`match-result ${result === 'W' ? 'win' : 'loss'}`}>
    <span className="result-letter">{result}</span>
    <span className="result-score">{score}</span>
  </div>
);
