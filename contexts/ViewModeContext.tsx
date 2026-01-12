'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ViewMode = 'professional' | 'business';

interface ViewModeContextType {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

const STORAGE_KEY = 'ux-audit-view-mode';

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ViewMode>('professional');
  const [mounted, setMounted] = useState(false);

  // Load mode from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEY) as ViewMode;
    if (savedMode === 'professional' || savedMode === 'business') {
      setModeState(savedMode);
    }
    setMounted(true);
  }, []);

  // Save mode to localStorage when it changes
  const setMode = (newMode: ViewMode) => {
    setModeState(newMode);
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, newMode);
    }
  };

  // Always provide the context, but use default 'professional' until mounted
  // This prevents the "must be used within ViewModeProvider" error
  return (
    <ViewModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}

