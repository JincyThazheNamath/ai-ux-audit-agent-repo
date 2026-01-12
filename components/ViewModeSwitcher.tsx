'use client';

import { Code, TrendingUp } from 'lucide-react';
import { useViewMode, ViewMode } from '../contexts/ViewModeContext';

/**
 * ViewModeSwitcher Component
 * 
 * Provides a segmented control interface for switching between
 * Professional and Business view modes.
 * 
 * Uses radio buttons styled as tabs for accessibility and modern UX.
 */
export default function ViewModeSwitcher() {
  const { mode, setMode } = useViewMode();

  return (
    <div className="flex items-center gap-2 bg-[#0a1628] rounded-lg p-1 border border-gray-700/50">
      <button
        type="button"
        onClick={() => setMode('professional')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
          ${mode === 'professional'
            ? 'bg-[#14b8a6] text-white shadow-lg shadow-teal-500/20'
            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
          }
        `}
        aria-pressed={mode === 'professional'}
        aria-label="Professional view mode"
      >
        <Code size={16} />
        <span className="hidden sm:inline">Professional</span>
        <span className="sm:hidden">Pro</span>
      </button>
      <button
        type="button"
        onClick={() => setMode('business')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
          ${mode === 'business'
            ? 'bg-[#14b8a6] text-white shadow-lg shadow-teal-500/20'
            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
          }
        `}
        aria-pressed={mode === 'business'}
        aria-label="Business view mode"
      >
        <TrendingUp size={16} />
        <span className="hidden sm:inline">Business</span>
        <span className="sm:hidden">Biz</span>
      </button>
    </div>
  );
}

