export interface NotificationError {
  id: string;
  type: 'PERMISSION_DENIED' | 'TOKEN_INVALID' | 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  context?: any;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean; // Add random jitter to prevent thundering herd
}

export interface NotificationRetryQueue {
  id: string;
  payload: any;
  retryCount: number;
  nextRetryAt: Date;
  error: NotificationError;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 500, // 500ms - more reasonable starting point
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitter: true,
};

// Non-retryable error types that should not be added to retry queue
const NON_RETRYABLE_ERRORS = new Set<NotificationError['type']>([
  'TOKEN_INVALID',
  'PERMISSION_DENIED',
]);

class NotificationErrorService {
  private errors: Map<string, NotificationError> = new Map();
  private retryQueue: Map<string, NotificationRetryQueue> = new Map();
  private retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG;
  private retryTimer: NodeJS.Timeout | null = null;
  private errorCallbacks: Set<(error: NotificationError) => void> = new Set();
  private retryCallbacks: Set<(queue: NotificationRetryQueue) => Promise<boolean>> = new Set();
  private lastRetryProcessTime: number = 0;
  private readonly MIN_RETRY_INTERVAL = 2000; // Minimum 2 seconds between retry processing

  /**
   * Log a notification error
   */
  logError(
    type: NotificationError['type'],
    message: string,
    context?: any,
    maxRetries?: number
  ): NotificationError {
    const error: NotificationError = {
      id: this.generateErrorId(),
      type,
      message,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: maxRetries || this.retryConfig.maxRetries,
      context,
    };

    this.errors.set(error.id, error);
    this.notifyErrorCallbacks(error);
    
    // Only log critical errors to prevent log flood
    if (error.type === 'PERMISSION_DENIED' || error.type === 'TOKEN_INVALID') {
      console.error('🔔 NotificationErrorService: Critical error logged:', error.type, error.message);
    }
    return error;
  }

  /**
   * Check if an error is retryable
   */
  isRetryable(error: NotificationError): boolean {
    return !NON_RETRYABLE_ERRORS.has(error.type);
  }

  /**
   * Add notification to retry queue
   */
  addToRetryQueue(
    payload: any,
    error: NotificationError,
    customDelay?: number
  ): void {
    // Don't retry non-retryable errors (TOKEN_INVALID, PERMISSION_DENIED)
    if (!this.isRetryable(error)) {
      console.warn('🔔 NotificationErrorService: Error type not retryable:', error.type, error.message);
      return;
    }

    const delay = customDelay || this.calculateRetryDelay(error.retryCount);
    
    const retryItem: NotificationRetryQueue = {
      id: this.generateRetryId(),
      payload,
      retryCount: error.retryCount,
      nextRetryAt: new Date(Date.now() + delay),
      error,
    };

    this.retryQueue.set(retryItem.id, retryItem);
    this.scheduleRetry();
    
    // Disable logging to prevent log flood
  }

  /**
   * Calculate retry delay with exponential backoff
   * Formula: base * 2^attempt, capped at maxDelay
   */
  private calculateRetryDelay(retryCount: number): number {
    // Calculate exponential backoff: 500ms * 2^attempt
    let delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, retryCount);
    
    // Cap at max delay (30 seconds)
    delay = Math.min(delay, this.retryConfig.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (this.retryConfig.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * jitterAmount;
    }
    
    return Math.max(delay, 100); // Minimum 100ms delay
  }

  /**
   * Schedule retry processing
   */
  private scheduleRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    if (this.retryQueue.size === 0) {
      return;
    }

    // Find the earliest retry time
    const earliestRetry = Array.from(this.retryQueue.values())
      .sort((a, b) => a.nextRetryAt.getTime() - b.nextRetryAt.getTime())[0];

    const delay = Math.max(1000, earliestRetry.nextRetryAt.getTime() - Date.now()); // Minimum 1 second delay
    
    this.retryTimer = setTimeout(() => {
      this.processRetryQueue();
    }, delay);
  }

  /**
   * Process retry queue
   */
  private async processRetryQueue(): Promise<void> {
    const now = Date.now();
    
    // Throttle retry processing to prevent rapid-fire loops
    if (now - this.lastRetryProcessTime < this.MIN_RETRY_INTERVAL) {
      this.scheduleRetry();
      return;
    }
    
    this.lastRetryProcessTime = now;
    
    const readyToRetry = Array.from(this.retryQueue.values())
      .filter(item => item.nextRetryAt.getTime() <= now);

    for (const item of readyToRetry) {
      await this.processRetryItem(item);
    }

    // Schedule next retry if there are more items
    if (this.retryQueue.size > 0) {
      this.scheduleRetry();
    }
  }

  /**
   * Process individual retry item
   */
  private async processRetryItem(item: NotificationRetryQueue): Promise<void> {
    try {
      // Disable logging to prevent log flood

      // Call retry callbacks
      let success = false;
      for (const callback of this.retryCallbacks) {
        try {
          const result = await callback(item);
          if (result) {
            success = true;
            break;
          }
        } catch (error) {
          console.error('🔔 NotificationErrorService: Retry callback error:', error);
        }
      }

      if (success) {
        // Remove from retry queue on success
        this.retryQueue.delete(item.id);
        // Disable success logging to prevent log flood
      } else {
        // Increment retry count and reschedule
        item.retryCount++;
        
        if (item.retryCount >= item.error.maxRetries) {
          // Max retries reached, remove from queue
          this.retryQueue.delete(item.id);
          console.error('🔔 NotificationErrorService: Max retries reached:', item.id);
        } else {
          // Reschedule for next retry (no logging to reduce noise)
          const delay = this.calculateRetryDelay(item.retryCount);
          item.nextRetryAt = new Date(Date.now() + delay);
        }
      }
    } catch (error) {
      console.error('🔔 NotificationErrorService: Error processing retry item:', error);
      this.retryQueue.delete(item.id);
    }
  }

  /**
   * Add retry callback
   */
  addRetryCallback(callback: (queue: NotificationRetryQueue) => Promise<boolean>): void {
    this.retryCallbacks.add(callback);
  }

  /**
   * Remove retry callback
   */
  removeRetryCallback(callback: (queue: NotificationRetryQueue) => Promise<boolean>): void {
    this.retryCallbacks.delete(callback);
  }

  /**
   * Add error callback
   */
  addErrorCallback(callback: (error: NotificationError) => void): void {
    this.errorCallbacks.add(callback);
  }

  /**
   * Remove error callback
   */
  removeErrorCallback(callback: (error: NotificationError) => void): void {
    this.errorCallbacks.delete(callback);
  }

  /**
   * Notify error callbacks
   */
  private notifyErrorCallbacks(error: NotificationError): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('🔔 NotificationErrorService: Error in error callback:', callbackError);
      }
    });
  }

  /**
   * Get all errors
   */
  getAllErrors(): NotificationError[] {
    return Array.from(this.errors.values());
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type: NotificationError['type']): NotificationError[] {
    return Array.from(this.errors.values()).filter(error => error.type === type);
  }

  /**
   * Get retry queue status
   */
  getRetryQueueStatus(): { count: number; items: NotificationRetryQueue[] } {
    return {
      count: this.retryQueue.size,
      items: Array.from(this.retryQueue.values()),
    };
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors.clear();
  }

  /**
   * Clear retry queue
   */
  clearRetryQueue(): void {
    console.log('🔔 NotificationErrorService: Clearing retry queue to stop log flood');
    this.retryQueue.clear();
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.lastRetryProcessTime = 0;
  }

  /**
   * Update retry configuration
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique retry ID
   */
  private generateRetryId(): string {
    return `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Emergency stop - immediately clear all retry queues and stop processing
   */
  emergencyStop(): void {
    console.log('🚨 NotificationErrorService: EMERGENCY STOP - Clearing all retry queues');
    this.clearRetryQueue();
    this.clearErrors();
    this.errorCallbacks.clear();
    this.retryCallbacks.clear();
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    this.clearRetryQueue();
    this.clearErrors();
    this.errorCallbacks.clear();
    this.retryCallbacks.clear();
  }
}

// Export singleton instance
export const notificationErrorService = new NotificationErrorService();
export default notificationErrorService;
