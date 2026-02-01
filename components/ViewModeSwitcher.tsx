'use client';

import { Code, TrendingUp } from 'lucide-react';
import { useViewMode } from '../contexts/ViewModeContext';

/**
 * ViewModeSwitcher Component
 *
 * Lets users choose how the audit report is framed:
 * Professional = technical feedback for UX/product/engineering.
 * Business = strategic insights for leadership.
 */
export default function ViewModeSwitcher() {
  const { mode, setMode } = useViewMode();

  return (
    <div className="flex gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setMode('professional')}
          className={`cursor-pointer
            flex-1 flex flex-col items-center sm:items-start gap-1 px-4 sm:px-5 py-3 sm:py-4 rounded-xl text-left transition-all duration-200 border-2
            ${mode === 'professional'
              ? 'bg-teal-600/20 border-teal-500 text-white shadow-lg shadow-teal-500/10'
              : 'border-gray-600/70 bg-[#0a1628]/80 text-gray-400 hover:text-gray-300 hover:border-gray-500 hover:bg-gray-800/30'
            }
          `}
          aria-pressed={mode === 'professional'}
          aria-label="Professional view: technical feedback for UXers, product people and engineers"
        >
          <span className="flex items-center gap-2 font-semibold text-sm sm:text-base">
            <Code size={18} className="flex-shrink-0" />
            Professional
          </span>
          <span className="text-xs sm:text-sm opacity-90 leading-snug">
            Technical feedback for UXers, product people and engineers
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode('business')}
          className={`cursor-pointer
            flex-1 flex flex-col items-center sm:items-start gap-1 px-4 sm:px-5 py-3 sm:py-4 rounded-xl text-left transition-all duration-200 border-2
            ${mode === 'business'
              ? 'bg-teal-600/20 border-teal-500 text-white shadow-lg shadow-teal-500/10'
              : 'border-gray-600/70 bg-[#0a1628]/80 text-gray-400 hover:text-gray-300 hover:border-gray-500 hover:bg-gray-800/30'
            }
          `}
          aria-pressed={mode === 'business'}
          aria-label="Business view: strategic insights for Directors and C-Suite leaders"
        >
          <span className="flex items-center gap-2 font-semibold text-sm sm:text-base">
            <TrendingUp size={18} className="flex-shrink-0" />
            Business
          </span>
          <span className="text-xs sm:text-sm opacity-90 leading-snug">
            Strategic insights for Directors and C-Suite leaders
          </span>
        </button>
    </div>
  );
}


