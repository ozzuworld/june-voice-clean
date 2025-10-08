// types/voice.types.ts
export interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  transcription: string;
  aiResponse: string;
  error: string | null;
}

export interface VoiceContextType extends VoiceState {
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  clearError: () => void;
  resetVoice: () => void;
}

export interface VoiceProcessingResult {
  success: boolean;
  transcription?: string;
  response_text?: string;
  response_audio?: string;
  error?: string;
  processing_time?: number;
}