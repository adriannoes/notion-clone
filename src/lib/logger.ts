/**
 * Utility for logging that only logs in development mode
 * In production, logs are suppressed to avoid exposing sensitive information
 */

const isDevelopment = import.meta.env.DEV;

type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

interface Logger {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

/**
 * Logger that only outputs in development mode
 * In production, error logs are still captured but not displayed
 */
export const logger: Logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    // Always log errors, but in production we might want to send to an error tracking service
    if (isDevelopment) {
      console.error(...args);
    }
    // TODO: In production, send errors to error tracking service (e.g., Sentry)
    // if (!isDevelopment) {
    //   errorTrackingService.captureException(args[0]);
    // }
  },
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};

