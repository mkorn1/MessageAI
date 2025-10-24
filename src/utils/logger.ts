/**
 * Simple logging utility with configurable verbosity levels
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LoggerConfig {
  level: LogLevel;
  quiet: boolean;
  verbose: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: (process.env.LOG_LEVEL as LogLevel) || 'info',
      quiet: process.argv.includes('--quiet') || process.argv.includes('-q') || false,
      verbose: process.argv.includes('--verbose') || process.argv.includes('-v') || false,
      ...config
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.config.quiet) return false;
    
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex <= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString().substring(11, 23); // HH:mm:ss.SSS
    const prefix = `[${timestamp}] ${level.toUpperCase()}`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, this.config.verbose ? 2 : 0)}`;
    }
    return `${prefix} ${message}`;
  }

  error(message: string, data?: any): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, data));
    }
  }

  // Convenience methods for specific services
  success(message: string, data?: any): void {
    this.info(`✅ ${message}`, data);
  }

  failure(message: string, data?: any): void {
    this.error(`❌ ${message}`, data);
  }

  warning(message: string, data?: any): void {
    this.warn(`⚠️ ${message}`, data);
  }

  // Create service-specific logger
  createServiceLogger(serviceName: string): ServiceLogger {
    return new ServiceLogger(serviceName, this.config);
  }
}

class ServiceLogger {
  constructor(
    private serviceName: string,
    private config: LoggerConfig
  ) {}

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString().substring(11, 23);
    const prefix = `[${timestamp}] ${level.toUpperCase()} [${this.serviceName}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, this.config.verbose ? 2 : 0)}`;
    }
    return `${prefix} ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.config.quiet) return false;
    
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex <= currentLevelIndex;
  }

  error(message: string, data?: any): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, data));
    }
  }

  success(message: string, data?: any): void {
    this.info(`✅ ${message}`, data);
  }

  failure(message: string, data?: any): void {
    this.error(`❌ ${message}`, data);
  }

  warning(message: string, data?: any): void {
    this.warn(`⚠️ ${message}`, data);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export classes for custom instances
export { Logger, ServiceLogger };
