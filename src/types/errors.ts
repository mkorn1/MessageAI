// Base error interface
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  context?: string; // Additional context about where the error occurred
}

// Firebase-specific errors
export interface FirebaseError extends AppError {
  type: 'firebase';
  service: 'auth' | 'firestore' | 'storage' | 'functions';
  originalError?: any; // The original Firebase error object
}

// Network-related errors
export interface NetworkError extends AppError {
  type: 'network';
  statusCode?: number;
  isOffline: boolean;
  retryable: boolean;
}

// Authentication errors
export interface AuthError extends AppError {
  type: 'auth';
  authCode: string; // Firebase auth error code
  userAction?: 'signin' | 'signup' | 'signout' | 'verify';
}

// Validation errors
export interface ValidationError extends AppError {
  type: 'validation';
  field: string;
  value: any;
  rule: string;
}

// Permission errors
export interface PermissionError extends AppError {
  type: 'permission';
  resource: string;
  action: 'read' | 'write' | 'delete';
  reason: string;
}

// Message-specific errors
export interface MessageError extends AppError {
  type: 'message';
  messageId?: string;
  chatId?: string;
  operation: 'send' | 'receive' | 'update' | 'delete';
}

// Chat-specific errors
export interface ChatError extends AppError {
  type: 'chat';
  chatId?: string;
  operation: 'create' | 'join' | 'leave' | 'update' | 'delete';
}

// User-specific errors
export interface UserError extends AppError {
  type: 'user';
  userId?: string;
  operation: 'create' | 'update' | 'delete' | 'fetch';
}

// Union type for all error types
export type ErrorType = 
  | FirebaseError 
  | NetworkError 
  | AuthError 
  | ValidationError 
  | PermissionError 
  | MessageError 
  | ChatError 
  | UserError;

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories for grouping
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  NETWORK = 'network',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  MESSAGE = 'message',
  CHAT = 'chat',
  USER = 'user',
  SYSTEM = 'system'
}

// Error handling result
export interface ErrorResult<T = any> {
  success: false;
  error: ErrorType;
  data?: T;
  retryable: boolean;
  retryAfter?: number; // Seconds to wait before retry
}

// Success result
export interface SuccessResult<T = any> {
  success: true;
  data: T;
  error?: never;
}

// Generic result type
export type Result<T = any> = SuccessResult<T> | ErrorResult<T>;

// Error handler configuration
export interface ErrorHandlerConfig {
  maxRetries: number;
  retryDelay: number; // Base delay in milliseconds
  retryBackoff: boolean; // Whether to use exponential backoff
  logErrors: boolean;
  reportErrors: boolean; // Whether to send errors to crash reporting
}

// Error context for better debugging
export interface ErrorContext {
  userId?: string;
  chatId?: string;
  messageId?: string;
  operation?: string;
  component?: string;
  timestamp: Date;
  userAgent?: string;
  version?: string;
}

// Common Firebase error codes
export enum FirebaseErrorCodes {
  // Auth errors
  AUTH_USER_NOT_FOUND = 'auth/user-not-found',
  AUTH_WRONG_PASSWORD = 'auth/wrong-password',
  AUTH_EMAIL_ALREADY_IN_USE = 'auth/email-already-in-use',
  AUTH_WEAK_PASSWORD = 'auth/weak-password',
  AUTH_INVALID_EMAIL = 'auth/invalid-email',
  AUTH_USER_DISABLED = 'auth/user-disabled',
  AUTH_TOO_MANY_REQUESTS = 'auth/too-many-requests',
  AUTH_NETWORK_REQUEST_FAILED = 'auth/network-request-failed',
  
  // Firestore errors
  FIRESTORE_PERMISSION_DENIED = 'permission-denied',
  FIRESTORE_UNAVAILABLE = 'unavailable',
  FIRESTORE_DEADLINE_EXCEEDED = 'deadline-exceeded',
  FIRESTORE_NOT_FOUND = 'not-found',
  FIRESTORE_ALREADY_EXISTS = 'already-exists',
  FIRESTORE_RESOURCE_EXHAUSTED = 'resource-exhausted',
  FIRESTORE_FAILED_PRECONDITION = 'failed-precondition',
  FIRESTORE_ABORTED = 'aborted',
  FIRESTORE_OUT_OF_RANGE = 'out-of-range',
  FIRESTORE_UNIMPLEMENTED = 'unimplemented',
  FIRESTORE_INTERNAL = 'internal',
  FIRESTORE_UNAUTHENTICATED = 'unauthenticated',
  FIRESTORE_DATA_LOSS = 'data-loss'
}

// Helper function to create errors
export const createError = <T extends ErrorType>(
  error: Omit<T, 'timestamp'>,
  context?: ErrorContext
): T => {
  return {
    ...error,
    timestamp: new Date(),
    context: context ? JSON.stringify(context) : undefined
  } as T;
};

// Helper function to check if error is retryable
export const isRetryableError = (error: ErrorType): boolean => {
  switch (error.type) {
    case 'network':
      return error.retryable;
    case 'firebase':
      return error.service === 'firestore' && 
             (error.code === FirebaseErrorCodes.FIRESTORE_UNAVAILABLE ||
              error.code === FirebaseErrorCodes.FIRESTORE_DEADLINE_EXCEEDED ||
              error.code === FirebaseErrorCodes.FIRESTORE_RESOURCE_EXHAUSTED);
    default:
      return false;
  }
};
