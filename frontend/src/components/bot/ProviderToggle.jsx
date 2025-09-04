import React, { useState, useEffect, useCallback } from 'react';
import { Bot, Zap, ChevronDown } from 'lucide-react';
import { API_URL } from '../../services/apiUrl';
import './ProviderToggle.css';

const ProviderToggle = ({ 
  selectedProvider = 'ollama', 
  onProviderChange, 
  disabled = false,
  showModels = false
}) => {
  const [config, setConfig] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load configuration
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/v1/bot/config`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        setConfig(data);
        
        if (data.available_providers?.[selectedProvider]?.default_model) {
          setSelectedModel(data.available_providers[selectedProvider].default_model);
        }
      } catch (error) {
        console.error('Config load failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConfig();
  }, [selectedProvider]);

  const handleProviderChange = useCallback((provider) => {
    if (disabled || !config?.available_providers[provider]?.available) return;
    
    const defaultModel = config.available_providers[provider].default_model;
    setSelectedModel(defaultModel);
    onProviderChange?.(provider, defaultModel);
  }, [disabled, config, onProviderChange]);

  const handleModelChange = useCallback((model) => {
    setSelectedModel(model);
    onProviderChange?.(selectedProvider, model);
  }, [selectedProvider, onProviderChange]);

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="provider-toggle-container">
      {/* Provider Toggle */}
      <div className="provider-toggle-wrapper">
        <button
          onClick={() => handleProviderChange('ollama')}
          disabled={disabled}
          className={`provider-button ${
            selectedProvider === 'ollama' ? 'active ollama' : 'inactive'
          }`}
        >
          <Bot size={16} />
          <span>Ollama</span>
        </button>
        
        <button
          onClick={() => handleProviderChange('openai')}
          disabled={disabled || !config?.available_providers?.openai?.available}
          className={`provider-button ${
            selectedProvider === 'openai' 
              ? 'active openai' 
              : config?.available_providers?.openai?.available
                ? 'inactive'
                : 'unavailable'
          }`}
        >
          <Zap size={16} />
          <span>OpenAI</span>
          {!config?.available_providers?.openai?.available && (
            <div className="status-indicator"></div>
          )}
        </button>
      </div>

      {/* Model Selection */}
      {showModels && config?.available_providers[selectedProvider]?.models && (
        <div className="model-selection">
          <label className="model-label">
            Model
          </label>
          <div className="model-select-wrapper">
            <select
              value={selectedModel || ''}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={disabled}
              className="model-select"
            >
              {config.available_providers[selectedProvider].models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <ChevronDown className="chevron-icon" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderToggle;
