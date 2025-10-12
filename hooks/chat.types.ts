// types/chat.types.ts
export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  isVoice?: boolean;
  audioFormat?: 'base64' | 'binary';
  metadata?: {
    processingTime?: number;
    model?: string;
    tokens?: number;
    audioSize?: number;
    audioChunks?: number;
  };
}

export interface AudioStreamState {
  isStreaming: boolean;
  totalChunks: number;
  receivedChunks: number;
  audioBuffer: ArrayBuffer[];
  format: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  audioStreamState?: AudioStreamState;
}

export interface ChatContextType extends ChatState {
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
  clearError: () => void;
  audioStreamState: AudioStreamState;
}
