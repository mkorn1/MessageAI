export interface AISuggestion {
  id: string;
  userId: string; // User who will see the suggestion
  chatId: string;
  messageId: string; // Triggering message
  type: AISuggestionType;
  status: AISuggestionStatus;
  title: string;
  description: string;
  metadata: AISuggestionMetadata;
  createdAt: Date;
  confirmedAt?: Date;
  rejectedAt?: Date;
  executedAt?: Date;
  executionResult?: {
    success: boolean;
    message?: string;
    data?: any;
  };
}

export enum AISuggestionType {
  CALENDAR_EVENT = 'calendar_event',
  DECISION_SUMMARY = 'decision_summary', 
  PRIORITY_FLAG = 'priority_flag',
  RSVP_TRACKING = 'rsvp_tracking',
  DEADLINE_REMINDER = 'deadline_reminder',
  SUGGESTED_RESPONSE = 'suggested_response'
}

export enum AISuggestionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  EXECUTED = 'executed'
}

export interface AISuggestionMetadata {
  // Calendar Event specific
  eventDate?: Date;
  eventLocation?: string;
  eventDuration?: number; // in minutes
  
  // Decision Summary specific
  decisionSummary?: string;
  participants?: string[]; // User IDs involved in decision
  
  // Priority Flag specific
  priorityLevel?: number; // 1-5 scale
  urgencyReason?: string;
  
  // RSVP Tracking specific
  rsvpDeadline?: Date;
  rsvpQuestion?: string;
  expectedRespondents?: string[]; // User IDs who should respond
  currentResponses?: { [userId: string]: 'yes' | 'no' | 'maybe' };
  
  // Deadline Reminder specific
  reminderDate?: Date;
  deadlineType?: 'hard' | 'soft'; // hard = must complete, soft = nice to have
  
  // Suggested Response specific
  suggestedResponse?: string;
  responseContext?: string; // Why this response was suggested
  
  // Common fields
  sourceMessages?: string[]; // IDs of analyzed messages
  confidence?: number; // 0-1 confidence score from AI
}

// Helper type for creating new suggestions (without id, timestamps)
export type CreateAISuggestion = Omit<AISuggestion, 'id' | 'createdAt' | 'confirmedAt' | 'rejectedAt' | 'executedAt' | 'executionResult'> & {
  createdAt?: Date;
};

// Helper type for updating suggestion status
export type UpdateAISuggestion = Partial<Pick<AISuggestion, 
  'status' | 'confirmedAt' | 'rejectedAt' | 'executedAt' | 'executionResult'
>>;

// Helper type for n8n webhook payload (what we send to n8n)
export interface N8nAnalysisPayload {
  message: {
    id: string;
    text: string;
    senderId: string;
    chatId: string;
    timestamp: string; // ISO string
    messageType: 'text' | 'image' | 'file' | 'system';
  };
  chatContext: {
    id: string;
    text: string;
    senderId: string;
    chatId: string;
    timestamp: string; // ISO string
  }[];
  userId: string;
}

// Helper type for n8n webhook response (what we receive from n8n)
export interface N8nAnalysisResponse {
  suggestions: {
    type: AISuggestionType;
    title: string;
    description: string;
    metadata: AISuggestionMetadata;
    confidence?: number; // 0-1 confidence score
  }[];
  analysisId?: string; // Optional tracking ID from n8n
}

// Helper type for suggestion creation from n8n response
export type CreateSuggestionFromN8n = {
  userId: string;
  chatId: string;
  messageId: string;
  type: AISuggestionType;
  title: string;
  description: string;
  metadata: AISuggestionMetadata;
  confidence?: number;
};

// Helper type for suggestion statistics
export interface SuggestionStats {
  total: number;
  pending: number;
  confirmed: number;
  rejected: number;
  executed: number;
  byType: Record<AISuggestionType, number>;
}

// Helper type for suggestion query options
export interface SuggestionQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'priority';
  orderDirection?: 'asc' | 'desc';
  includeExecuted?: boolean;
}

// Helper type for batch operations
export interface BatchSuggestionUpdate {
  suggestionIds: string[];
  updates: UpdateAISuggestion;
}

// Helper type for suggestion export (for debugging/analytics)
export interface SuggestionExport {
  suggestion: AISuggestion;
  chatName?: string;
  messagePreview?: string;
  timeSinceCreated?: string;
}

// Helper type for suggestion filters
export type AISuggestionFilter = {
  status?: AISuggestionStatus;
  type?: AISuggestionType;
  chatId?: string;
  userId?: string;
};

// Type-specific metadata interfaces for better type safety
export interface CalendarEventMetadata {
  eventDate: Date;
  eventLocation?: string;
  eventDuration?: number; // in minutes
  eventTitle?: string;
  attendees?: string[]; // User IDs to invite
}

export interface DecisionSummaryMetadata {
  decisionSummary: string;
  participants: string[]; // User IDs involved in decision
  decisionDate?: Date;
  keyPoints?: string[];
}

export interface PriorityFlagMetadata {
  priorityLevel: number; // 1-5 scale
  urgencyReason: string;
  originalMessage?: string;
  suggestedAction?: string;
}

export interface RSVPTrackingMetadata {
  rsvpDeadline: Date;
  rsvpQuestion: string;
  expectedRespondents: string[]; // User IDs who should respond
  currentResponses: { [userId: string]: 'yes' | 'no' | 'maybe' };
  eventDetails?: string;
}

export interface DeadlineReminderMetadata {
  reminderDate: Date;
  deadlineType: 'hard' | 'soft'; // hard = must complete, soft = nice to have
  taskDescription?: string;
  assignee?: string; // User ID responsible
}

export interface SuggestedResponseMetadata {
  suggestedResponse: string;
  responseContext: string; // Why this response was suggested
  originalMessage?: string;
  tone?: 'formal' | 'casual' | 'urgent' | 'friendly';
}

// Validation helpers
export const validateSuggestionMetadata = (type: AISuggestionType, metadata: AISuggestionMetadata): boolean => {
  switch (type) {
    case AISuggestionType.CALENDAR_EVENT:
      return !!(metadata.eventDate);
    case AISuggestionType.DECISION_SUMMARY:
      return !!(metadata.decisionSummary && metadata.participants?.length);
    case AISuggestionType.PRIORITY_FLAG:
      return !!(metadata.priorityLevel && metadata.urgencyReason);
    case AISuggestionType.RSVP_TRACKING:
      return !!(metadata.rsvpDeadline && metadata.rsvpQuestion && metadata.expectedRespondents?.length);
    case AISuggestionType.DEADLINE_REMINDER:
      return !!(metadata.reminderDate && metadata.deadlineType);
    case AISuggestionType.SUGGESTED_RESPONSE:
      return !!(metadata.suggestedResponse && metadata.responseContext);
    default:
      return false;
  }
};

// Icon mapping for UI components
export const getSuggestionIcon = (type: AISuggestionType): string => {
  switch (type) {
    case AISuggestionType.CALENDAR_EVENT:
      return 'calendar';
    case AISuggestionType.DECISION_SUMMARY:
      return 'doc.text';
    case AISuggestionType.PRIORITY_FLAG:
      return 'exclamationmark.triangle';
    case AISuggestionType.RSVP_TRACKING:
      return 'person.2';
    case AISuggestionType.DEADLINE_REMINDER:
      return 'clock';
    case AISuggestionType.SUGGESTED_RESPONSE:
      return 'bubble.left';
    default:
      return 'questionmark';
  }
};

/**
 * FIRESTORE SCHEMA DOCUMENTATION
 * 
 * Collection: aiSuggestions
 * 
 * Document Structure:
 * {
 *   id: string,                    // Auto-generated Firestore document ID
 *   userId: string,                // User ID who will see this suggestion (indexed)
 *   chatId: string,                // Chat ID where suggestion originated (indexed)
 *   messageId: string,             // Message ID that triggered the suggestion (indexed)
 *   type: string,                  // AISuggestionType enum value (indexed)
 *   status: string,                // AISuggestionStatus enum value (indexed)
 *   title: string,                 // Display title for the suggestion
 *   description: string,           // Detailed description of the suggestion
 *   metadata: object,              // Type-specific metadata (see AISuggestionMetadata)
 *   createdAt: timestamp,          // When suggestion was created (indexed)
 *   confirmedAt?: timestamp,       // When user confirmed the suggestion
 *   rejectedAt?: timestamp,        // When user rejected the suggestion
 *   executedAt?: timestamp,        // When action was executed
 *   executionResult?: object       // Result of action execution
 * }
 * 
 * REQUIRED FIRESTORE INDEXES:
 * 
 * 1. Composite Index: userId + status + createdAt (desc)
 *    - Used for: Fetching user's suggestions ordered by creation date
 *    - Query: collection('aiSuggestions').where('userId', '==', userId).where('status', '==', 'pending').orderBy('createdAt', 'desc')
 * 
 * 2. Composite Index: userId + type + createdAt (desc)
 *    - Used for: Filtering suggestions by type
 *    - Query: collection('aiSuggestions').where('userId', '==', userId).where('type', '==', 'calendar_event').orderBy('createdAt', 'desc')
 * 
 * 3. Composite Index: chatId + status + createdAt (desc)
 *    - Used for: Fetching suggestions for a specific chat
 *    - Query: collection('aiSuggestions').where('chatId', '==', chatId).where('status', '==', 'pending').orderBy('createdAt', 'desc')
 * 
 * 4. Single Field Index: createdAt (desc)
 *    - Used for: Global suggestion queries and analytics
 *    - Query: collection('aiSuggestions').orderBy('createdAt', 'desc')
 * 
 * SECURITY RULES:
 * 
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     // AI Suggestions - users can only access their own suggestions
 *     match /aiSuggestions/{suggestionId} {
 *       allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
 *       allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
 *     }
 *   }
 * }
 * 
 * DATA VALIDATION RULES:
 * 
 * 1. Required Fields:
 *    - userId: must be non-empty string
 *    - chatId: must be non-empty string  
 *    - messageId: must be non-empty string
 *    - type: must be valid AISuggestionType enum value
 *    - status: must be valid AISuggestionStatus enum value
 *    - title: must be non-empty string (max 200 chars)
 *    - description: must be non-empty string (max 1000 chars)
 *    - metadata: must be object with type-appropriate fields
 *    - createdAt: must be valid timestamp
 * 
 * 2. Optional Fields:
 *    - confirmedAt: timestamp (only set when status = 'confirmed')
 *    - rejectedAt: timestamp (only set when status = 'rejected') 
 *    - executedAt: timestamp (only set when status = 'executed')
 *    - executionResult: object with success boolean and optional message/data
 * 
 * 3. Field Constraints:
 *    - title: 1-200 characters
 *    - description: 1-1000 characters
 *    - metadata.confidence: 0-1 if present
 *    - metadata.priorityLevel: 1-5 if present
 * 
 * PERFORMANCE CONSIDERATIONS:
 * 
 * 1. Document Size: Keep metadata objects reasonable size (< 1MB per document)
 * 2. Index Usage: Always use indexed fields in queries to avoid full collection scans
 * 3. Pagination: Use limit() and startAfter() for large result sets
 * 4. Real-time Listeners: Use specific queries with indexed fields for efficient listeners
 * 
 * EXAMPLE DOCUMENTS:
 * 
 * Calendar Event Suggestion:
 * {
 *   id: "suggestion_123",
 *   userId: "user_456", 
 *   chatId: "chat_789",
 *   messageId: "msg_101",
 *   type: "calendar_event",
 *   status: "pending",
 *   title: "Add team meeting to calendar",
 *   description: "Meeting scheduled for tomorrow at 2pm in Conference Room A",
 *   metadata: {
 *     eventDate: "2024-03-15T14:00:00Z",
 *     eventLocation: "Conference Room A",
 *     eventDuration: 60,
 *     confidence: 0.95
 *   },
 *   createdAt: "2024-03-14T10:30:00Z"
 * }
 * 
 * Priority Flag Suggestion:
 * {
 *   id: "suggestion_124",
 *   userId: "user_456",
 *   chatId: "chat_789", 
 *   messageId: "msg_102",
 *   type: "priority_flag",
 *   status: "pending",
 *   title: "Priority: Urgent message about school closure",
 *   description: "This message contains urgent information that requires immediate attention",
 *   metadata: {
 *     priorityLevel: 5,
 *     urgencyReason: "School closure announcement",
 *     originalMessage: "URGENT: School will be closed tomorrow due to weather",
 *     confidence: 0.88
 *   },
 *   createdAt: "2024-03-14T10:35:00Z"
 * }
 */
