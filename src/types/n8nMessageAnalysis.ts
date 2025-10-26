/**
 * n8n Message Analysis Types
 * 
 * Types for storing raw n8n webhook analysis results in Firestore
 */

import { N8nActualResponse } from './aiSuggestion';
import { Message } from './message';

/**
 * Raw analysis result stored in Firestore
 * This represents the complete response from n8n for a message
 */
export interface N8nMessageAnalysis {
  id: string; // Firestore document ID
  messageId: string; // The message that was analyzed
  chatId: string; // Chat where the message belongs
  senderId: string; // User who sent the message
  analysisResponse: N8nActualResponse[]; // Full n8n response
  chatContext: Message[]; // Context messages used for analysis
  createdAt: Date; // When analysis was created
  processed?: boolean; // Whether suggestions have been generated from this
  processedAt?: Date; // When suggestions were generated
}

/**
 * Input type for creating new analysis
 */
export type CreateN8nMessageAnalysis = Omit<N8nMessageAnalysis, 'id' | 'createdAt'>;

/**
 * Update type for modifying analysis (e.g., marking as processed)
 */
export type UpdateN8nMessageAnalysis = Partial<Pick<N8nMessageAnalysis, 'processed' | 'processedAt'>>;
