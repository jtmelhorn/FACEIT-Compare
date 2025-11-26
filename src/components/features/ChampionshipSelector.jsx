/**
 * Championship Selector Component
 * Filters matches by Championship Season (S50+)
 */

export const ChampionshipSelector = ({ currentSeason, onSelect }) => {
    // Generate seasons S50 to S55 only
    const seasons = Array.from({ length: 6 }, (_, i) => 50 + i);

    const options = seasons.map(season => ({
        id: `S${season}`,
        label: `S${season}`
    }));
    return (
        <div className="season-selector">
            <label htmlFor="championship-select">Season:</label>
            <div className="select-wrapper">
                <select
                    id="championship-select"
                    value={currentSeason}
                    onChange={(e) => onSelect(e.target.value)}
                    className="season-select"
                >
                    {options.map(opt => (
                        <option key={opt.id} value={opt.id}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};
