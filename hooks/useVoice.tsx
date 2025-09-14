// hooks/useVoice.tsx
import React, { createContext, useCallback, useContext, useState } from 'react';

interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  transcription: string;
  aiResponse: string;
  error: string | null;
}

interface VoiceContextType extends VoiceState {
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  clearError: () => void;
  resetVoice: () => void;
}

const VoiceContext = createContext<VoiceContextType | null>(null);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    isPlaying: false,
    transcription: '',
    aiResponse: '',
    error: null,
  });

  const startListening = useCallback(async () => {
    setState(prev => ({ 
      ...prev, 
      isListening: true,
      error: null,
    }));
  }, []);

  const stopListening = useCallback(async () => {
    setState(prev => ({ 
      ...prev, 
      isListening: false,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const resetVoice = useCallback(() => {
    setState({
      isListening: false,
      isProcessing: false,
      isPlaying: false,
      transcription: '',
      aiResponse: '',
      error: null,
    });
  }, []);

  const value: VoiceContextType = {
    ...state,
    startListening,
    stopListening,
    clearError,
    resetVoice,
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice(): VoiceContextType {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}