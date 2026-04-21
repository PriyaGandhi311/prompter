export type SuggestionType = 'question' | 'talking-point' | 'answer' | 'fact-check';

export interface Suggestion {
  id: string;
  type: SuggestionType;
  preview: string;
}

export interface SuggestionBatch {
  id: string;
  suggestions: Suggestion[];
  timestamp: number;
}

export interface TranscriptChunk {
  id: string;
  text: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AppSettings {
  groqApiKey: string;
  model: string;
  suggestionPrompt: string;
  detailedAnswerPrompt: string;
  chatSystemPrompt: string;
  suggestionContextChunks: number;
  chatContextChunks: number;
}
