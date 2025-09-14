// src/services/voice.service.ts
import { AUTH_CONFIG } from '@/config/auth.config';
import type { VoiceProcessingResult } from '@/types/voice.types';

export interface VoiceProcessingRequest {
  audio_data: string; // base64 encoded audio
  language?: string;
  voice_settings?: {
    language_code?: string;
    voice_name?: string;
    audio_encoding?: string;
  };
}

class VoiceService {
  private orchestratorUrl = AUTH_CONFIG.services.orchestrator;

  /**
   * Process audio through the complete voice pipeline:
   * Audio -> STT -> AI -> TTS -> Audio Response
   */
  async processVoiceInteraction(
    request: VoiceProcessingRequest,
    accessToken: string
  ): Promise<VoiceProcessingResult> {
    const startTime = Date.now();
    
    try {
      console.log('🎤 Processing voice interaction...');
      
      const response = await fetch(`${this.orchestratorUrl}/v1/process-audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          audio_data: request.audio_data,
          language: request.language || AUTH_CONFIG.voice.defaultLanguage,
          voice_settings: request.voice_settings || {
            language_code: AUTH_CONFIG.voice.defaultLanguage,
            voice_name: AUTH_CONFIG.voice.defaultVoice,
            audio_encoding: AUTH_CONFIG.voice.audioEncoding,
          },
        }),
      });

      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Voice processing failed:', response.status, errorText);
        
        return {
          success: false,
          error: `Server error (${response.status}): ${errorText}`,
          processing_time: processingTime,
        };
      }

      const result = await response.json();
      console.log('✅ Voice processing completed:', {
        transcription: result.transcription?.slice(0, 50) + '...',
        response_length: result.response_text?.length,
        has_audio: !!result.response_audio,
        processing_time: processingTime,
      });

      return {
        success: true,
        transcription: result.transcription,
        response_text: result.response_text,
        response_audio: result.response_audio,
        processing_time: processingTime,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('Voice processing error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
        processing_time: processingTime,
      };
    }
  }

  /**
   * Test if the voice processing pipeline is available
   */
  async testVoicePipeline(accessToken: string): Promise<boolean> {
    try {
      // Create a small test audio data (silence)
      const testAudioData = 'UklGRiYAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQIAAAAAAA==';
      
      const result = await this.processVoiceInteraction(
        { audio_data: testAudioData },
        accessToken
      );

      return result.success;
    } catch (error) {
      console.error('Voice pipeline test failed:', error);
      return false;
    }
  }

  /**
   * Get voice processing capabilities
   */
  async getVoiceCapabilities(accessToken: string): Promise<{
    available: boolean;
    stt_enabled: boolean;
    tts_enabled: boolean;
    ai_enabled: boolean;
    supported_languages?: string[];
  }> {
    try {
      const response = await fetch(`${this.orchestratorUrl}/configz`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          available: false,
          stt_enabled: false,
          tts_enabled: false,
          ai_enabled: false,
        };
      }

      const config = await response.json();
      
      return {
        available: true,
        stt_enabled: config.stt_client_ready || false,
        tts_enabled: config.tts_client_ready || false,
        ai_enabled: config.ai_model_enabled || false,
        supported_languages: [
          AUTH_CONFIG.voice.defaultLanguage,
          'es-ES',
          'fr-FR',
          'de-DE',
        ],
      };

    } catch (error) {
      console.error('Failed to get voice capabilities:', error);
      return {
        available: false,
        stt_enabled: false,
        tts_enabled: false,
        ai_enabled: false,
      };
    }
  }
}

// Export singleton instance
export const voiceService = new VoiceService();