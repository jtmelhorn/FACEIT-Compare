/**
 * Badge components for skill level and rating display
 * KISS: Simple visual indicators with color coding
 */

export const SkillLevelBadge = ({ level }) => {
  const getColor = (l) => {
    if (l >= 9) return 'skill-elite';
    if (l >= 7) return 'skill-high';
    if (l >= 5) return 'skill-mid';
    if (l >= 3) return 'skill-low';
    return 'skill-new';
  };

  return <span className={`skill-badge ${getColor(level)}`}>Lvl {level}</span>;
};

export const RatingBadge = ({ rating }) => {
  const getColor = (r) => {
    if (r >= 1.20) return 'rating-elite';
    if (r >= 1.10) return 'rating-high';
    if (r >= 1.00) return 'rating-good';
    if (r >= 0.90) return 'rating-avg';
    return 'rating-low';
  };

  return <span className={`rating-badge ${getColor(rating)}`}>{rating.toFixed(2)}</span>;
};
