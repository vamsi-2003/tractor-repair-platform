import { Platform } from 'react-native';
import { supabase } from './supabase';
import { useAuthStore } from '../store/authStore';

export interface CrashReportPayload {
  error: Error | string | any;
  componentStack?: string | null;
  screenName?: string;
  severity?: 'fatal' | 'error' | 'warning';
  extraData?: Record<string, any>;
}

const APP_VERSION = '1.2.0';

/**
 * Sends a crash or error report directly to Supabase app_crash_logs table.
 * Designed to be completely safe: will never throw an exception or block the UI thread.
 */
export async function recordCrash(payload: CrashReportPayload): Promise<void> {
  try {
    const authState = useAuthStore.getState();
    const user = authState.user;
    const profile = authState.profile;
    const selectedRole = authState.selectedRole;

    const errorMessage =
      payload.error instanceof Error
        ? payload.error.message
        : typeof payload.error === 'string'
        ? payload.error
        : JSON.stringify(payload.error || 'Unknown Error');

    const stackTrace =
      payload.error instanceof Error ? payload.error.stack : null;

    const deviceInfo = {
      platform: Platform.OS,
      osVersion: Platform.Version,
      isTesting: __DEV__,
      extra: payload.extraData || {},
    };

    // Asynchronously insert into database
    await supabase.from('app_crash_logs').insert({
      user_id: user?.id || null,
      role: profile?.role || selectedRole || 'anonymous',
      error_message: errorMessage.substring(0, 2000),
      stack_trace: stackTrace ? stackTrace.substring(0, 4000) : null,
      component_stack: payload.componentStack
        ? payload.componentStack.substring(0, 4000)
        : null,
      screen_name: payload.screenName || 'unknown',
      app_version: APP_VERSION,
      device_info: deviceInfo,
      severity: payload.severity || 'error',
    });
  } catch (loggingError) {
    // Fail silently in production so crash reporting itself never causes a crash
    if (__DEV__) {
      console.warn('Crash logging fallback error:', loggingError);
    }
  }
}

/**
 * Initializes global uncaught exception handlers for React Native Hermes & web.
 */
export function initCrashReporting(): void {
  // 1. Global React Native Uncaught Error Handler
  const globalErrorUtils = (global as any).ErrorUtils;
  if (globalErrorUtils && typeof globalErrorUtils.setGlobalHandler === 'function') {
    const originalHandler = globalErrorUtils.getGlobalHandler();
    globalErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
      recordCrash({
        error,
        severity: isFatal ? 'fatal' : 'error',
        screenName: 'GlobalErrorHandler',
      });

      if (typeof originalHandler === 'function') {
        originalHandler(error, isFatal);
      }
    });
  }

  // 2. Web unhandled promise rejection handler
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      recordCrash({
        error: event.reason || new Error('Unhandled Promise Rejection'),
        severity: 'error',
        screenName: 'UnhandledPromiseRejection',
      });
    });
  }
}
