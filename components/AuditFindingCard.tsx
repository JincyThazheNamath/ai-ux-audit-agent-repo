'use client';

import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { AuditFinding } from '../types/audit';

interface AuditFindingCardProps {
  finding: AuditFinding;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

// Utility function to get severity color classes
const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return 'bg-red-900/30 text-red-300 border-red-500/50';
    case 'high':
      return 'bg-orange-900/30 text-orange-300 border-orange-500/50';
    case 'medium':
      return 'bg-yellow-900/30 text-yellow-300 border-yellow-500/50';
    case 'low':
      return 'bg-teal-900/30 text-teal-300 border-teal-500/50';
    default:
      return 'bg-gray-800/30 text-gray-300 border-gray-500/50';
  }
};

// Utility function to get category icon
const getCategoryIcon = (category: string): string => {
  switch (category) {
    case 'accessibility':
      return '♿';
    case 'usability':
      return '👆';
    case 'design':
      return '🎨';
    case 'performance':
      return '⚡';
    case 'seo':
      return '🔍';
    default:
      return '📋';
  }
};

/**
 * Reusable Audit Finding Card Component
 * 
 * Displays a single audit finding with expandable details including
 * description, suggestion, and code snippets.
 * 
 * @example
 * ```tsx
 * <AuditFindingCard
 *   finding={finding}
 *   index={0}
 *   isExpanded={expandedFindings.has(0)}
 *   onToggle={() => toggleFinding(0)}
 * />
 * ```
 */
export default function AuditFindingCard({
  finding,
  index,
  isExpanded,
  onToggle,
}: AuditFindingCardProps) {
  return (
    <div
      className="border-2 border-gray-700/50 rounded-xl bg-[#0a1628] hover:border-teal-500/50 transition-all"
    >
      <div
        className="p-6 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <span className="text-2xl">{getCategoryIcon(finding.category)}</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                {finding.issue}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(finding.severity)}`}>
                  {finding.severity.toUpperCase()}
                </span>
                <span className="text-sm text-gray-400 capitalize">
                  {finding.category}
                </span>
                <span className="text-sm text-gray-600">•</span>
                <span className="text-sm text-gray-400">{finding.location}</span>
              </div>
              {isExpanded && (
                <p className="text-gray-300 mt-4">{finding.description}</p>
              )}
            </div>
          </div>
          <button className="ml-4 text-gray-400 hover:text-teal-400 transition-colors">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 pt-0 space-y-4">
          <div className="bg-teal-900/20 border-l-4 border-teal-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-2">
              <Info className="text-teal-400 mt-0.5" size={18} />
              <div className="flex-1">
                <p className="font-semibold text-teal-300 mb-1">Suggestion:</p>
                <p className="text-teal-200">{finding.suggestion}</p>
              </div>
            </div>
          </div>

          {finding.codeSnippet && (
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto border border-gray-700">
              <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                <code>{finding.codeSnippet}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

