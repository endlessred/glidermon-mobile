// Development logging utility
import { Platform } from 'react-native';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private logs: Array<{ timestamp: string; level: LogLevel; message: string; data?: any }> = [];

  log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, data };

    this.logs.push(logEntry);

    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }

    // Console output for development
    if (__DEV__) {
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      switch (level) {
        case 'error':
          console.error(prefix, message, data);
          break;
        case 'warn':
          console.warn(prefix, message, data);
          break;
        case 'debug':
          console.debug(prefix, message, data);
          break;
        default:
          console.log(prefix, message, data);
      }
    }
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  getLogs() {
    return this.logs;
  }

  getRecentErrors() {
    return this.logs.filter(log => log.level === 'error').slice(-10);
  }
}

export const logger = new Logger();

// Global error handler
if (Platform.OS === 'web') {
  window.addEventListener('error', (event) => {
    logger.error('Global Error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.stack
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled Promise Rejection', {
      reason: event.reason,
      promise: event.promise
    });
  });
}