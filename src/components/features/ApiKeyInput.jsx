import { useState } from 'react';

// API Key Input Component
export const ApiKeyInput = ({ apiKey, setApiKey, onVerify, verificationStatus }) => {
  const [showKey, setShowKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!apiKey.trim()) return;
    setIsVerifying(true);
    await onVerify(apiKey);
    setIsVerifying(false);
  };

  return (
    <div className="api-key-section">
      <div className="api-key-header">
        <span className="api-icon">🔑</span>
        <span>FACEIT API Key</span>
        {verificationStatus === 'valid' && <span className="status-badge valid">✓ Verified</span>}
        {verificationStatus === 'invalid' && <span className="status-badge invalid">✗ Invalid</span>}
      </div>
      <div className="api-key-input-wrapper">
        <input
          type={showKey ? 'text' : 'password'}
          placeholder="Enter your FACEIT API key..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && apiKey.trim()) {
              handleVerify();
            }
          }}
        />
        <button
          className="toggle-visibility"
          onClick={() => setShowKey(!showKey)}
          title={showKey ? 'Hide key' : 'Show key'}
        >
          {showKey ? '👁️' : '👁️‍🗨️'}
        </button>
        {verificationStatus === 'valid' && (
          <button
            className="clear-api-btn"
            onClick={() => setApiKey('')}
            title="Clear API key"
          >
            Clear
          </button>
        )}
        <button
          className="verify-btn"
          onClick={handleVerify}
          disabled={!apiKey.trim() || isVerifying || verificationStatus === 'valid'}
          title="Verify API key"
        >
          {isVerifying ? (
            <span className="mini-spinner"></span>
          ) : (
            '✓ Verify'
          )}
        </button>
      </div>
      <div className="api-key-help">
        Get your API key from{' '}
        <a href="https://developers.faceit.com" target="_blank" rel="noopener noreferrer">
          developers.faceit.com
        </a>
        {' '}→ App Studio → Create App → API Keys
      </div>
      {!apiKey && (
        <div className="demo-mode-notice">
          <span className="demo-icon">ℹ️</span>
          Running in demo mode with sample data
        </div>
      )}
      {verificationStatus === 'invalid' && (
        <div className="error-notice">
          <span className="error-icon">⚠️</span>
          API key verification failed. Please check your key.
        </div>
      )}
      {verificationStatus === 'valid' && (
        <div className="success-notice">
          <span className="success-icon">✓</span>
          API key verified! You can now search for real FACEIT teams.
        </div>
      )}
    </div>
  );
};
