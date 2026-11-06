import { useRef, useCallback } from 'react';

/**
 * Returns a debounced callback that executes immediately on the first tap (leading edge)
 * and ignores any subsequent calls within `delayMs`.
 * This prevents double-tapping and rapid button mashing on slow mobile networks.
 */
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delayMs: number = 1000
): (...args: Parameters<T>) => void {
  const lastCallTime = useRef<number>(0);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallTime.current >= delayMs) {
        lastCallTime.current = now;
        return callback(...args);
      }
    },
    [callback, delayMs]
  );
}

/**
 * Generic debounce function for non-React contexts.
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number = 1000
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delayMs);
  };
}
