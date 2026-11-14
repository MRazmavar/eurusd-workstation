import { useState, useEffect, useCallback } from 'react';

export type ViewModePreference = 'auto' | 'mobile' | 'desktop';
export type EffectiveMode = 'mobile' | 'desktop';

export interface DeviceModeState {
  viewMode: ViewModePreference;
  effectiveMode: EffectiveMode;
  isMobile: boolean;
  isTablet: boolean;
  isTouch: boolean;
  screenWidth: number;
  screenHeight: number;
  setViewMode: (mode: ViewModePreference) => void;
  toggleMode: () => void;
}

export function useDeviceMode(): DeviceModeState {
  const [viewMode, setViewModeState] = useState<ViewModePreference>(() => {
    try {
      const saved = localStorage.getItem('eurusd_view_mode');
      if (saved === 'auto' || saved === 'mobile' || saved === 'desktop') {
        return saved;
      }
    } catch {}
    return 'auto';
  });

  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const [isTouch, setIsTouch] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const setViewMode = useCallback((mode: ViewModePreference) => {
    setViewModeState(mode);
    try {
      localStorage.setItem('eurusd_view_mode', mode);
    } catch {}
  }, []);

  const toggleMode = useCallback(() => {
    // If currently mobile -> toggle to desktop; if desktop -> toggle to mobile
    const currentEffective = viewMode === 'mobile' ? 'mobile' : viewMode === 'desktop' ? 'desktop' : (windowSize.width < 768 ? 'mobile' : 'desktop');
    const nextMode: ViewModePreference = currentEffective === 'mobile' ? 'desktop' : 'mobile';
    setViewMode(nextMode);
  }, [viewMode, windowSize.width, setViewMode]);

  // Evaluate effective mode
  const effectiveMode: EffectiveMode = (() => {
    if (viewMode === 'mobile') return 'mobile';
    if (viewMode === 'desktop') return 'desktop';
    // 'auto' mode: check screen width (< 768px -> mobile)
    return windowSize.width < 768 ? 'mobile' : 'desktop';
  })();

  const isTablet = windowSize.width >= 768 && windowSize.width < 1024;

  return {
    viewMode,
    effectiveMode,
    isMobile: effectiveMode === 'mobile',
    isTablet,
    isTouch,
    screenWidth: windowSize.width,
    screenHeight: windowSize.height,
    setViewMode,
    toggleMode,
  };
}
