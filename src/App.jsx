/**
 * FACEIT Team Compare - Main Application
 * KISS: Clean, modular architecture with clear separation of concerns
 *
 * Refactored from 4174 lines to ~300 lines by extracting:
 * - Services (API layer)
 * - Utils (transformers, filters, storage)
 * - Hooks (business logic)
 * - Components (UI and features)
 */

import { useState, useMemo } from 'react';
import './App.css';
import { VIEW_MODES } from './config/constants';
import { predictVeto } from './utils/vetoPredictor';
import { useApiKey, useTeamData, useTeamSelection } from './hooks';
import { LoadingSpinner } from './components/ui';
import {
  ApiKeyInput,
  TeamSearch,
  TeamCard,
  MapStatsDashboard,
  VetoPrediction,
  ChampionshipSelector
} from './components/features';

export const App = () => {
  // Custom hooks for state management
  const { apiKey, setApiKey, apiKeyStatus, isVerifying, verifyApiKey, api } = useApiKey();
  const { teamA, teamB, viewMode, setTeamA, setTeamB, toggleViewMode } = useTeamSelection();
  const { fetchTeamData, loading, error } = useTeamData(api);

  // Local UI state
  const [activeSection, setActiveSection] = useState('overview');
  const [vetoFormat, setVetoFormat] = useState('BO3');
  const [championshipFilter, setChampionshipFilter] = useState('S55');

  // Team selection handler
  const handleTeamSelect = async (team, slot) => {
    if (!team) {
      if (slot === 'A') setTeamA(null);
      else setTeamB(null);
      return;
    }

    const teamData = await fetchTeamData(team.id, championshipFilter);
    if (teamData) {
      if (slot === 'A') setTeamA(teamData);
      else setTeamB(teamData);
    }
  };

  // Handle championship filter change
  const handleFilterChange = async (newFilter) => {
    setChampionshipFilter(newFilter);
    if (teamA) {
      const dataA = await fetchTeamData(teamA.id, newFilter);
      setTeamA(dataA);
    }
    if (teamB) {
      const dataB = await fetchTeamData(teamB.id, newFilter);
      setTeamB(dataB);
    }
  };

  // Calculate veto prediction for compare mode
  const vetoPrediction = useMemo(() => {
    if (viewMode === VIEW_MODES.COMPARE && teamA && teamB) {
      return predictVeto(teamA, teamB, vetoFormat);
    }
    return null;
  }, [teamA, teamB, viewMode, vetoFormat]);

  // Render API key input if not verified
  if (apiKeyStatus.valid !== true) {
    return (
      <div className="app-container">
        <div className="app-header">
          <div className="header-brand">
            <span className="brand-icon">🎮</span>
            <h1>FACEIT Team Compare</h1>
          </div>
          <div className="brand-tag">CS2 Analytics</div>
        </div>
        <ApiKeyInput
          apiKey={apiKey}
          setApiKey={setApiKey}
          status={apiKeyStatus}
          isVerifying={isVerifying}
          onVerify={verifyApiKey}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <div className="app-header">
        <div className="header-brand">
          <span className="brand-icon">🎮</span>
          <h1>FACEIT Team Compare</h1>
        </div>
        <div className="brand-tag">CS2 Analytics</div>

        {/* View Mode Toggle */}
        <div className="view-mode-toggle">
          <button
            className={`mode-btn ${viewMode === VIEW_MODES.SINGLE ? 'active' : ''}`}
            onClick={() => viewMode !== VIEW_MODES.SINGLE && toggleViewMode()}
          >
            Single Team
          </button>
          <button
            className={`mode-btn ${viewMode === VIEW_MODES.COMPARE ? 'active' : ''}`}
            onClick={() => viewMode !== VIEW_MODES.COMPARE && toggleViewMode()}
          >
            Compare Teams
          </button>
        </div>
      </div>

      {/* Championship Selector */}
      <ChampionshipSelector currentSeason={championshipFilter} onSelect={handleFilterChange} />

      {/* Team Selection */}
      <div className="team-search-section">
        <TeamSearch
          label="Team A"
          onSelect={(team) => handleTeamSelect(team, 'A')}
          selectedTeam={teamA}
          excludeId={teamB?.id}
          api={api}
        />

        {viewMode === VIEW_MODES.COMPARE && (
          <TeamSearch
            label="Team B"
            onSelect={(team) => handleTeamSelect(team, 'B')}
            selectedTeam={teamB}
            excludeId={teamA?.id}
            api={api}
          />
        )}
      </div>

      {/* Loading State */}
      {loading && <LoadingSpinner />}

      {/* Error State */}
      {
        error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )
      }

      {/* Main Content */}
      {
        teamA && (
          <>
            {/* Navigation */}
            <nav className="section-nav">
              <button
                className={`nav-btn ${activeSection === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveSection('overview')}
              >
                Team Overview
              </button>
              <button
                className={`nav-btn ${activeSection === 'maps' ? 'active' : ''}`}
                onClick={() => setActiveSection('maps')}
              >
                Map Stats
              </button>
              {viewMode === VIEW_MODES.COMPARE && teamB && (
                <button
                  className={`nav-btn ${activeSection === 'veto' ? 'active' : ''}`}
                  onClick={() => setActiveSection('veto')}
                >
                  Veto Prediction
                </button>
              )}
            </nav>

            {/* Team Overview Section - Merged "At a Glance" + "Team Details" */}
            {activeSection === 'overview' && (
              <section className="team-overview-section">
                {/* At a Glance Cards */}
                <div className="section-header">
                  <h2>At a Glance</h2>
                </div>
                <div className="glance-grid">
                  <OverviewCard team={teamA} label="Team A" />
                  {viewMode === VIEW_MODES.COMPARE && teamB && (
                    <OverviewCard team={teamB} label="Team B" />
                  )}
                </div>

                {/* Team Details */}
                <div className="section-header" style={{ marginTop: '32px' }}>
                  <h2>Team Details</h2>
                </div>
                <div className={viewMode === VIEW_MODES.SINGLE ? 'single-team-section' : 'comparison-section'}>
                  <div className="teams-grid">
                    <TeamCard team={teamA} side="team-a" />
                    {viewMode === VIEW_MODES.COMPARE && teamB && (
                      <TeamCard team={teamB} side="team-b" />
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Map Stats Section */}
            {activeSection === 'maps' && (
              <section className="maps-section">
                <div className="section-header">
                  <h2>Map Statistics</h2>
                </div>
                <MapStatsDashboard
                  teamA={teamA}
                  teamB={viewMode === VIEW_MODES.COMPARE ? teamB : null}
                  singleMode={viewMode === VIEW_MODES.SINGLE}
                />
              </section>
            )}

            {/* Veto Prediction Section */}
            {activeSection === 'veto' && viewMode === VIEW_MODES.COMPARE && teamB && vetoPrediction && (
              <section className="veto-prediction-section">
                <div className="section-header">
                  <h2>Veto Prediction</h2>
                </div>
                <div className="veto-format-selector">
                  <button
                    className={`format-btn ${vetoFormat === 'BO1' ? 'active' : ''}`}
                    onClick={() => setVetoFormat('BO1')}
                  >
                    BO1
                  </button>
                  <button
                    className={`format-btn ${vetoFormat === 'BO3' ? 'active' : ''}`}
                    onClick={() => setVetoFormat('BO3')}
                  >
                    BO3
                  </button>
                </div>
                <VetoPrediction
                  prediction={vetoPrediction}
                  teamA={teamA}
                  teamB={teamB}
                />
              </section>
            )}
          </>
        )
      }

      {/* Empty State */}
      {
        !teamA && !loading && (
          <div className="empty-state">
            <p>Select a team to get started</p>
          </div>
        )
      }
    </div >
  );
};

/**
 * Overview Card Component
 * KISS: Simple summary card for quick team comparison
 */
const OverviewCard = ({ team, label }) => {
  const totalMaps = Object.keys(team.mapStats || {}).length;
  const avgRating = team.roster.length > 0
    ? (team.roster.reduce((sum, p) => sum + p.rating, 0) / team.roster.length).toFixed(2)
    : '1.00';

  return (
    <div className="glance-card">
      <div className="glance-card-header">
        <span className="glance-label">{label}</span>
        <span className="glance-team-tag">{team.tag}</span>
      </div>
      <div className="glance-stats">
        <div className="glance-stat">
          <span className="glance-stat-label">Win Rate</span>
          <span className="glance-stat-value">{team.record.winRate}%</span>
        </div>
        <div className="glance-stat">
          <span className="glance-stat-label">Matches</span>
          <span className="glance-stat-value">{team.record.matches}</span>
        </div>
        <div className="glance-stat">
          <span className="glance-stat-label">Avg Rating</span>
          <span className="glance-stat-value">{avgRating}</span>
        </div>
        <div className="glance-stat">
          <span className="glance-stat-label">Maps Played</span>
          <span className="glance-stat-value">{totalMaps}</span>
        </div>
      </div>
    </div>
  );
};
