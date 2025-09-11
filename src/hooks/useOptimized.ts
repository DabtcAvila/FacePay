'use client';

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { getPerformanceMonitor } from '@/lib/performance-monitor';

// Optimized debounce hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Optimized throttle hook
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback);
  const lastCallTime = useRef<number>(0);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCallTime.current >= delay) {
      lastCallTime.current = now;
      return callbackRef.current(...args);
    }
  }, [delay]) as T;
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  options?: IntersectionObserverInit
): [React.RefObject<HTMLElement>, boolean] {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [options]);

  return [ref, isVisible];
}

// Media query hook
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }, [query]);

  return matches;
}

// Local storage hook with performance optimization
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

// Optimized async data fetching hook
export function useAsyncData<T, E = Error>(
  asyncFunction: () => Promise<T>,
  dependencies: React.DependencyList = []
): {
  data: T | null;
  loading: boolean;
  error: E | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<E | null>(null);
  const monitor = getPerformanceMonitor();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await monitor.measureAsyncOperation(
        `useAsyncData-${asyncFunction.name}`,
        asyncFunction
      );
      setData(result);
    } catch (err) {
      setError(err as E);
    } finally {
      setLoading(false);
    }
  }, [asyncFunction, monitor]);

  useEffect(() => {
    fetchData();
  }, dependencies);

  return { data, loading, error, refetch: fetchData };
}

// Optimized previous value hook
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
}

// Event listener hook with cleanup
export function useEventListener<T extends keyof WindowEventMap>(
  eventType: T,
  handler: (event: WindowEventMap[T]) => void,
  options?: AddEventListenerOptions
) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const eventListener = (event: WindowEventMap[T]) => savedHandler.current(event);
    window.addEventListener(eventType, eventListener, options);
    
    return () => {
      window.removeEventListener(eventType, eventListener, options);
    };
  }, [eventType, options]);
}

// Optimized form state hook
export function useFormState<T extends Record<string, any>>(
  initialState: T
): {
  state: T;
  setState: React.Dispatch<React.SetStateAction<T>>;
  updateField: (field: keyof T, value: T[keyof T]) => void;
  reset: () => void;
  isDirty: boolean;
} {
  const [state, setState] = useState<T>(initialState);
  const initialStateRef = useRef(initialState);

  const updateField = useCallback((field: keyof T, value: T[keyof T]) => {
    setState(prev => ({ ...prev, [field]: value }));
  }, []);

  const reset = useCallback(() => {
    setState(initialStateRef.current);
  }, []);

  const isDirty = useMemo(() => {
    return JSON.stringify(state) !== JSON.stringify(initialStateRef.current);
  }, [state]);

  return { state, setState, updateField, reset, isDirty };
}

// Performance monitoring hook
export function usePerformanceTracking(componentName: string) {
  const monitor = getPerformanceMonitor();
  const renderCount = useRef(0);
  const startTime = useRef<number>(0);

  useEffect(() => {
    renderCount.current += 1;
    startTime.current = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime.current;
      
      if (renderCount.current > 1 && duration > 16) { // 16ms = 60fps threshold
        console.warn(
          `[Performance] ${componentName} render took ${duration.toFixed(2)}ms (render #${renderCount.current})`
        );
      }
    };
  });

  return {
    measureAsync: monitor.measureAsyncOperation.bind(monitor),
    getMetrics: monitor.getMetrics.bind(monitor),
    renderCount: renderCount.current,
  };
}

// Memoization helper for complex calculations
export function useComputedValue<T>(
  computeFn: () => T,
  dependencies: React.DependencyList
): T {
  return useMemo(() => {
    const startTime = performance.now();
    const result = computeFn();
    const endTime = performance.now();
    
    if (endTime - startTime > 5) {
      console.warn(`[Performance] Expensive computation took ${(endTime - startTime).toFixed(2)}ms`);
    }
    
    return result;
  }, dependencies);
}

// Optimized callback with stable reference
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: React.DependencyList
): T {
  const callbackRef = useRef<T>(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, dependencies);
  
  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
}

// Lazy loading hook for components
export function useLazyComponent<P = {}>(
  factory: () => Promise<{ default: React.ComponentType<P> }>,
  fallback?: React.ComponentType<P>
): React.ComponentType<P> | null {
  const [Component, setComponent] = useState<React.ComponentType<P> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    factory()
      .then(module => {
        setComponent(() => module.default);
        setLoading(false);
      })
      .catch(error => {
        console.error('Failed to load component:', error);
        setLoading(false);
      });
  }, [factory]);

  if (loading && fallback) {
    return fallback;
  }

  return Component;
}

// Resource preloader hook
export function usePreloadResource(
  href: string,
  as: 'script' | 'style' | 'image' | 'font' = 'script'
) {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    
    if (as === 'font') {
      link.crossOrigin = 'anonymous';
    }
    
    document.head.appendChild(link);
    
    return () => {
      try {
        document.head.removeChild(link);
      } catch (e) {
        // Link might have been removed already
      }
    };
  }, [href, as]);
}

// Battery API hook for performance optimization
export function useBatteryOptimization() {
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean | null>(null);

  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(battery.level);
        setIsCharging(battery.charging);

        const updateBattery = () => {
          setBatteryLevel(battery.level);
          setIsCharging(battery.charging);
        };

        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);

        return () => {
          battery.removeEventListener('levelchange', updateBattery);
          battery.removeEventListener('chargingchange', updateBattery);
        };
      });
    }
  }, []);

  // Return performance recommendations based on battery
  const shouldReduceAnimations = batteryLevel !== null && batteryLevel < 0.2 && !isCharging;
  const shouldLimitBackgroundTasks = batteryLevel !== null && batteryLevel < 0.1 && !isCharging;

  return {
    batteryLevel,
    isCharging,
    shouldReduceAnimations,
    shouldLimitBackgroundTasks,
  };
}