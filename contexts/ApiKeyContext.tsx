
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

interface ApiKeyContextType {
  apiKey: string | null;
  saveApiKey: (key: string) => void;
  removeApiKey: () => void;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

const API_KEY_STORAGE_KEY = 'gemini_api_key';

export const ApiKeyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
      if (storedKey) {
        setApiKey(storedKey);
      }
    } catch (error) {
      console.error("Failed to read API key from localStorage", error);
    }
  }, []);

  const saveApiKey = useCallback((key: string) => {
    if (key) {
      localStorage.setItem(API_KEY_STORAGE_KEY, key);
      setApiKey(key);
    }
  }, []);
  
  const removeApiKey = useCallback(() => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey(null);
  }, []);

  return (
    <ApiKeyContext.Provider value={{ apiKey, saveApiKey, removeApiKey }}>
      {children}
    </ApiKeyContext.Provider>
  );
};

export const useApiKey = () => {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error('useApiKey must be used within an ApiKeyProvider');
  }
  return context;
};
