'use client';

import React, { useEffect, useRef } from 'react';
import { initializeAllAnalytics } from '@/lib/analytics-config';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => {
  const initialized = useRef(false);

  useEffect(() => {
    // Only initialize once
    if (initialized.current) return;
    
    // Initialize all analytics systems
    try {
      const systems = initializeAllAnalytics();
      
      if (systems) {
        console.log('📊 Analytics systems initialized successfully');
        
        // Track application start
        // TODO: Implement when analytics is ready
        // // systems.analytics?.track('app_start', {
        //   timestamp: new Date().toISOString(),
        //   user_agent: navigator.userAgent,
        //   screen_resolution: `${screen.width}x${screen.height}`,
        //   language: navigator.language,
        //   timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        // });

        // Set up beforeunload handler to flush any pending data
        const handleBeforeUnload = () => {
          // systems.analytics?.destroy();
          // systems.monitoring?.destroy();
          // systems.abTesting?.destroy();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        
        // Set up visibility change handler for pause/resume tracking
        const handleVisibilityChange = () => {
          if (document.hidden) {
            // systems.analytics?.track('page_blur', {
            //   timestamp: new Date().toISOString()
            // });
          } else {
            // systems.analytics?.track('page_focus', {
            //   timestamp: new Date().toISOString()
            // });
          }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup function
        return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      }
    } catch (error) {
      console.error('❌ Failed to initialize analytics systems:', error);
    }

    initialized.current = true;
  }, []);

  return <>{children}</>;
};

export default AnalyticsProvider;