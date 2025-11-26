/**
 * useApiKey Hook
 * KISS: Manages API key state and verification
 */

import { useState, useEffect, useMemo } from 'react';
import { createFaceitAPI } from '../services/faceitApi';
import { getApiKey, setApiKey as saveApiKey } from '../utils/storage';

export const useApiKey = () => {
  const [apiKey, setApiKeyState] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState({ valid: null, error: null });
  const [isVerifying, setIsVerifying] = useState(false);

  // Load API key on mount
  useEffect(() => {
    const stored = getApiKey();
    if (stored) {
      setApiKeyState(stored);
    }
  }, []);

  // Auto-verify stored API key
  useEffect(() => {
    if (apiKey && apiKeyStatus.valid === null) {
      verifyApiKey();
    }
  }, [apiKey]);

  // Create API instance
  const api = useMemo(() => {
    if (!apiKey) return null;
    return createFaceitAPI(apiKey);
  }, [apiKey]);

  /**
   * Verify API key is valid
   */
  const verifyApiKey = async () => {
    if (!apiKey) {
      setApiKeyStatus({ valid: false, error: 'API key required' });
      return;
    }

    setIsVerifying(true);
    const testApi = createFaceitAPI(apiKey);
    const result = await testApi.verifyApiKey();

    setApiKeyStatus(result);
    setIsVerifying(false);

    if (result.valid) {
      saveApiKey(apiKey);
    }
  };

  /**
   * Set API key and reset status
   */
  const setApiKey = (key) => {
    setApiKeyState(key);
    setApiKeyStatus({ valid: null, error: null });
  };

  return {
    apiKey,
    setApiKey,
    apiKeyStatus,
    isVerifying,
    verifyApiKey,
    api,
  };
};
