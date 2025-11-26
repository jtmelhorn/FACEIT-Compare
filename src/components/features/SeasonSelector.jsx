/**
 * Season Selector Component
 * Allows filtering match data by time range
 */

export const SeasonSelector = ({ currentSeason, onSelect }) => {
    const seasons = [
        { id: 'all', label: 'All Time' },
        { id: '6m', label: 'Last 6 Months' },
        { id: '3m', label: 'Last 3 Months' },
        { id: '1m', label: 'Last Month' }
    ];

    return (
        <div className="season-selector">
            <label htmlFor="season-select">Time Period:</label>
            <div className="select-wrapper">
                <select
                    id="season-select"
                    value={currentSeason}
                    onChange={(e) => onSelect(e.target.value)}
                    className="season-select"
                >
                    {seasons.map(season => (
                        <option key={season.id} value={season.id}>
                            {season.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};
