/**
 * n8n Webhook Configuration
 * 
 * This file contains all configuration settings for n8n webhook integration.
 * Update these values when deploying to different environments or when
 * webhook URLs change.
 */

export interface N8nConfig {
  // Webhook URLs
  analysisWebhookUrl: string;
  actionWebhookUrl?: string;
  
  // Authentication
  apiKey?: string;
  
  // Request settings
  timeout: number;
  retryAttempts: number;
  
  // Environment settings
  environment: 'development' | 'staging' | 'production';
  
  // Feature flags
  enableRetries: boolean;
  enableLogging: boolean;
}

/**
 * Default n8n configuration
 */
const defaultConfig: N8nConfig = {
  // Webhook URLs - Update these for your n8n instance
  analysisWebhookUrl: 'https://mkorn1.app.n8n.cloud/webhook-test/cfb3bef3-f299-4f85-8eb4-cb350dbbb810',
  actionWebhookUrl: undefined, // Will be set when action webhook is created
  
  // Authentication - Set if n8n requires API key
  apiKey: process.env.N8N_API_KEY,
  
  // Request settings
  timeout: 10000, // 10 seconds
  retryAttempts: 3,
  
  // Environment
  environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
  
  // Feature flags
  enableRetries: true,
  enableLogging: true,
};

/**
 * Environment-specific configurations
 */
const environmentConfigs: Partial<Record<string, Partial<N8nConfig>>> = {
  development: {
    timeout: 15000, // Longer timeout for development
    enableLogging: true,
  },
  
  staging: {
    timeout: 10000,
    enableLogging: true,
    // Add staging-specific webhook URLs here
    // analysisWebhookUrl: 'https://staging-n8n.example.com/webhook/...',
  },
  
  production: {
    timeout: 8000, // Shorter timeout for production
    enableLogging: false, // Disable verbose logging in production
    // Add production-specific webhook URLs here
    // analysisWebhookUrl: 'https://prod-n8n.example.com/webhook/...',
  },
};

/**
 * Get the current n8n configuration
 * Merges default config with environment-specific overrides
 */
export function getN8nConfig(): N8nConfig {
  const envConfig = environmentConfigs[defaultConfig.environment] || {};
  
  return {
    ...defaultConfig,
    ...envConfig,
  };
}

/**
 * Update n8n configuration at runtime
 * Useful for dynamic configuration changes
 */
export function updateN8nConfig(updates: Partial<N8nConfig>): N8nConfig {
  const currentConfig = getN8nConfig();
  return {
    ...currentConfig,
    ...updates,
  };
}

/**
 * Validate n8n configuration
 * Ensures all required fields are present and valid
 */
export function validateN8nConfig(config: N8nConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate webhook URL
  if (!config.analysisWebhookUrl) {
    errors.push('Analysis webhook URL is required');
  } else if (!isValidUrl(config.analysisWebhookUrl)) {
    errors.push('Analysis webhook URL must be a valid HTTPS URL');
  }
  
  // Validate action webhook URL if provided
  if (config.actionWebhookUrl && !isValidUrl(config.actionWebhookUrl)) {
    errors.push('Action webhook URL must be a valid HTTPS URL');
  }
  
  // Validate timeout
  if (config.timeout < 1000 || config.timeout > 60000) {
    errors.push('Timeout must be between 1000ms and 60000ms');
  }
  
  // Validate retry attempts
  if (config.retryAttempts < 0 || config.retryAttempts > 10) {
    errors.push('Retry attempts must be between 0 and 10');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a string is a valid HTTPS URL
 */
function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Get webhook URL for a specific environment
 * Useful for switching between test and production webhooks
 */
export function getWebhookUrl(type: 'analysis' | 'action', environment?: string): string {
  const config = getN8nConfig();
  const env = environment || config.environment;
  
  if (type === 'analysis') {
    return config.analysisWebhookUrl;
  } else if (type === 'action') {
    if (!config.actionWebhookUrl) {
      throw new Error('Action webhook URL not configured');
    }
    return config.actionWebhookUrl;
  }
  
  throw new Error(`Unknown webhook type: ${type}`);
}

/**
 * Check if n8n integration is enabled
 * Can be used to disable the feature entirely
 */
export function isN8nEnabled(): boolean {
  const config = getN8nConfig();
  return !!config.analysisWebhookUrl && config.environment !== 'disabled';
}

/**
 * Get configuration summary for logging/debugging
 * Excludes sensitive information like API keys
 */
export function getConfigSummary(): Record<string, any> {
  const config = getN8nConfig();
  
  return {
    environment: config.environment,
    analysisWebhookUrl: config.analysisWebhookUrl ? '***configured***' : 'not set',
    actionWebhookUrl: config.actionWebhookUrl ? '***configured***' : 'not set',
    hasApiKey: !!config.apiKey,
    timeout: config.timeout,
    retryAttempts: config.retryAttempts,
    enableRetries: config.enableRetries,
    enableLogging: config.enableLogging,
  };
}

// Export the default configuration for direct access
export default getN8nConfig();
