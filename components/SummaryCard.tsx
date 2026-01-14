'use client';

import { useState, useEffect, useRef } from 'react';
import { Share2, Download, X, ZoomIn, Eye, EyeOff, AlertCircle, TrendingUp, Target, Award, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuditResult, AuditFinding } from '../types/audit';
import { useViewMode } from '../contexts/ViewModeContext';
import { transformSummaryForBusiness } from '../lib/viewAdapters';

interface SummaryCardProps {
  result: AuditResult;
  onShare: () => void;
  onDownload: () => void;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-teal-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
};

/**
 * Displays the audit summary with overall score, severity breakdown, and category breakdown.
 * Includes share and download functionality for the audit report.
 */
export default function SummaryCard({ result, onShare, onDownload }: SummaryCardProps) {
  const { mode } = useViewMode();
  const [isHovered, setIsHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);
  const [hoveredOverlay, setHoveredOverlay] = useState<number | null>(null);
  const [clickedOverlay, setClickedOverlay] = useState<number | null>(null);
  const [currentIssueIndex, setCurrentIssueIndex] = useState<number>(0); // For cycling through issues in mobile
  const [isMobile, setIsMobile] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Get business view data if in business mode
  const businessView = mode === 'business' ? transformSummaryForBusiness(result) : null;

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal && !isClosing) {
        handleCloseModal();
      }
    };

    if (showModal) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showModal, isClosing]);

  // Handle closing animation
  const handleCloseModal = () => {
    setIsClosing(true);
    // Wait for exit animation to complete before unmounting
    setTimeout(() => {
      setShowModal(false);
      setIsClosing(false);
      setShowOverlays(true); // Reset overlay state
      setClickedOverlay(null); // Reset clicked overlay on mobile
      setCurrentIssueIndex(0); // Reset issue index
    }, 350); // Match animation duration (350ms)
  };

  // Helper function to create concise CEO-friendly mobile description
  const getMobileSummary = (finding: AuditFinding): { title: string; impact: string } => {
    const title = finding.issue;
    
    // Extract key impact point - first meaningful sentence (CEO-friendly)
    const fullDesc = finding.description;
    const sentences = fullDesc.split(/[.!?]/).filter(s => s.trim().length > 15);
    
    // Get first sentence, limit to 70 chars for mobile readability
    let impact = sentences.length > 0 
      ? sentences[0].trim()
      : fullDesc;
    
    // Truncate if too long, but keep it natural
    if (impact.length > 70) {
      // Try to break at word boundary
      const truncated = impact.substring(0, 67);
      const lastSpace = truncated.lastIndexOf(' ');
      impact = lastSpace > 50 
        ? truncated.substring(0, lastSpace) + '...'
        : truncated + '...';
    }
    
    return { title, impact };
  };

  // Get severity color
  const getSeverityColor = (severity: AuditFinding['severity']) => {
    switch (severity) {
      case 'critical': return 'rgba(239, 68, 68, 0.3)'; // red
      case 'high': return 'rgba(249, 115, 22, 0.3)'; // orange
      case 'medium': return 'rgba(234, 179, 8, 0.3)'; // yellow
      case 'low': return 'rgba(20, 184, 166, 0.3)'; // teal
      default: return 'rgba(156, 163, 175, 0.3)'; // gray
    }
  };

  const getSeverityBorderColor = (severity: AuditFinding['severity']) => {
    switch (severity) {
      case 'critical': return 'rgba(239, 68, 68, 0.8)';
      case 'high': return 'rgba(249, 115, 22, 0.8)';
      case 'medium': return 'rgba(234, 179, 8, 0.8)';
      case 'low': return 'rgba(20, 184, 166, 0.8)';
      default: return 'rgba(156, 163, 175, 0.8)';
    }
  };

  const getSeverityTextColor = (severity: AuditFinding['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-300';
      case 'high': return 'text-orange-300';
      case 'medium': return 'text-yellow-300';
      case 'low': return 'text-teal-300';
      default: return 'text-gray-300';
    }
  };

  // Map location strings to approximate positions
  const getLocationPosition = (location: string): { top: number; left: number; width: number; height: number } => {
    const lowerLocation = location.toLowerCase();
    
    // Header/Navigation areas (top)
    if (lowerLocation.includes('header') || lowerLocation.includes('navigation') || lowerLocation.includes('nav') || lowerLocation.includes('menu')) {
      return { top: 5, left: 5, width: 90, height: 15 };
    }
    
    // Footer areas (bottom)
    if (lowerLocation.includes('footer') || lowerLocation.includes('bottom')) {
      return { top: 80, left: 5, width: 90, height: 15 };
    }
    
    // Hero section (top-middle)
    if (lowerLocation.includes('hero') || lowerLocation.includes('banner') || lowerLocation.includes('above the fold')) {
      return { top: 20, left: 5, width: 90, height: 25 };
    }
    
    // Sidebar (left or right)
    if (lowerLocation.includes('sidebar') || lowerLocation.includes('side')) {
      return { top: 20, left: 2, width: 20, height: 60 };
    }
    
    // Forms (middle)
    if (lowerLocation.includes('form') || lowerLocation.includes('contact') || lowerLocation.includes('input')) {
      return { top: 50, left: 30, width: 40, height: 20 };
    }
    
    // Buttons/CTAs (various)
    if (lowerLocation.includes('button') || lowerLocation.includes('cta') || lowerLocation.includes('call to action')) {
      return { top: 40, left: 40, width: 20, height: 10 };
    }
    
    // Content/Main area (middle)
    if (lowerLocation.includes('content') || lowerLocation.includes('main') || lowerLocation.includes('body')) {
      return { top: 30, left: 10, width: 80, height: 50 };
    }
    
    // Video/Media (middle)
    if (lowerLocation.includes('video') || lowerLocation.includes('media') || lowerLocation.includes('image')) {
      return { top: 35, left: 20, width: 60, height: 30 };
    }
    
    // Default: center area
    return { top: 30, left: 20, width: 60, height: 40 };
  };

  // Group findings by location for overlay display
  const groupedFindings = result.findings.reduce((acc, finding, index) => {
    const position = getLocationPosition(finding.location);
    const key = `${position.top}-${position.left}-${position.width}-${position.height}`;
    
    if (!acc[key]) {
      acc[key] = {
        position,
        findings: [],
        highestSeverity: finding.severity,
      };
    }
    
    acc[key].findings.push({ ...finding, originalIndex: index });
    
    // Update highest severity
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    if (severityOrder[finding.severity] > severityOrder[acc[key].highestSeverity]) {
      acc[key].highestSeverity = finding.severity;
    }
    
    return acc;
  }, {} as Record<string, { position: { top: number; left: number; width: number; height: number }; findings: (AuditFinding & { originalIndex: number })[]; highestSeverity: AuditFinding['severity'] }>);

  // Update image dimensions when modal opens
  useEffect(() => {
    if (showModal && imageRef.current) {
      const updateDimensions = () => {
        if (imageRef.current) {
          const rect = imageRef.current.getBoundingClientRect();
          setImageDimensions({ width: rect.width, height: rect.height });
        }
      };
      
      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      
      return () => window.removeEventListener('resize', updateDimensions);
    }
  }, [showModal]);

  return (
    <>
      <div className="bg-[#1a2332] rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 border border-gray-700/50 overflow-x-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Audit Summary</h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={onShare}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  title="Share Report"
                >
                  <Share2 size={14} className="sm:w-4 sm:h-4" />
                  <span>Share</span>
                </button>
                <button
                  onClick={onDownload}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-[#0a1628] hover:bg-[#0f1d35] border border-gray-600 text-white rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  title="Download Report"
                >
                  <Download size={14} className="sm:w-4 sm:h-4" />
                  <span>Download</span>
                </button>
              </div>
            </div>
            <p className="text-gray-300 break-all">{result.url}</p>
            <p className="text-sm text-gray-400 mt-1">
              {new Date(result.timestamp).toLocaleString()}
            </p>
          </div>
          {result.screenshot && (
            <div
              className="relative group cursor-pointer"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={() => setShowModal(true)}
            >
              <div className="relative w-full md:w-64 h-48 md:h-40 overflow-hidden rounded-lg border-2 border-gray-600 transition-all duration-300 group-hover:border-teal-500 group-hover:shadow-lg group-hover:shadow-teal-500/20">
                <img
                  src={result.screenshot}
                  alt="Website screenshot"
                  className={`w-full h-full object-cover transition-transform duration-300 ${
                    isHovered ? 'scale-110' : 'scale-100'
                  }`}
                />
                {/* Overlay with zoom icon */}
                <div
                  className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
                    isHovered ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <div className="bg-teal-600/90 rounded-full p-3 transform transition-transform duration-300 group-hover:scale-110">
                    <ZoomIn size={24} className="text-white" />
                  </div>
                </div>
                {/* Hint text */}
                <div
                  className={`absolute bottom-2 left-2 right-2 text-xs text-white bg-black/70 px-2 py-1 rounded transition-opacity duration-300 ${
                    isHovered ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  Click to view full size
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Executive Summary for Client Mode */}
        {mode === 'business' && businessView && (
          <div className="mb-6 space-y-4">
            {/* Main Executive Summary Card */}
            <div className="bg-gradient-to-br from-teal-900/20 to-blue-900/20 rounded-xl border border-teal-500/30 p-4 sm:p-6">
              <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                <TrendingUp className="text-teal-400 mt-1 flex-shrink-0" size={20} style={{ width: '20px', height: '20px' }} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2">Executive Summary</h3>
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-3 sm:mb-4">{businessView.executiveSummary}</p>
                </div>
              </div>
            </div>

            {/* Industry Benchmark Comparison */}
            {businessView.industryBenchmark && (
              <div className="bg-[#0a1628] rounded-xl border border-gray-700/50 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-4">
                  <BarChart3 className="text-blue-400" size={18} />
                  <h4 className="text-base sm:text-lg font-semibold text-white">Industry Benchmark Comparison</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-teal-900/20 rounded-lg p-3 sm:p-4 border border-teal-500/30">
                    <div className="text-xl sm:text-2xl font-bold text-teal-300 mb-1 break-words">
                      Top {businessView.industryBenchmark.percentile}%
                    </div>
                    <div className="text-xs sm:text-sm text-gray-400">Industry Positioning</div>
                  </div>
                  <div className="bg-blue-900/20 rounded-lg p-3 sm:p-4 border border-blue-500/30">
                    <div className="text-xl sm:text-2xl font-bold text-blue-300 mb-1 capitalize break-words">
                      {businessView.industryBenchmark.positioning}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-400">Performance Level</div>
                  </div>
                  <div className="bg-purple-900/20 rounded-lg p-3 sm:p-4 border border-purple-500/30">
                    <div className="text-xl sm:text-2xl font-bold text-purple-300 mb-1 break-words">
                      {result.summary.overallScore}/100
                    </div>
                    <div className="text-xs sm:text-sm text-gray-400">Quality Score</div>
                  </div>
                </div>
                <p className="text-sm text-gray-300 mt-4 italic">
                  {businessView.industryBenchmark.comparison}
                </p>
              </div>
            )}

            {/* Value Proposition */}
            {businessView.valueProposition && businessView.valueProposition.length > 0 && (
              <div className="bg-[#0a1628]/50 rounded-lg p-4 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="text-yellow-400" size={18} />
                  <h4 className="text-sm font-semibold text-yellow-300">Analysis Credibility</h4>
                </div>
                <ul className="space-y-2">
                  {businessView.valueProposition.map((prop, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-teal-400 mt-0.5">✓</span>
                      <span>{prop}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Business Impact Assessment */}
            {businessView.businessImpact && (
              <div className="bg-[#0a1628]/50 rounded-lg p-4 border border-gray-700/50">
                <div className="flex items-start gap-2 mb-2">
                  <Target className="text-orange-400 mt-0.5" size={18} />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-orange-300 mb-2">Business Impact Assessment</h4>
                    <p className="text-sm text-gray-300">{businessView.businessImpact}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Prioritized Action Plan */}
            {businessView.prioritizedActionPlan && businessView.prioritizedActionPlan.length > 0 && (
              <div className="bg-[#0a1628]/50 rounded-lg p-4 border border-gray-700/50">
                <h4 className="text-sm font-semibold text-teal-300 mb-3">Prioritized Action Plan</h4>
                <div className="space-y-3">
                  {businessView.prioritizedActionPlan.map((plan, idx) => (
                    <div key={idx} className="border-l-4 border-teal-500 pl-3">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                        <span className="text-xs font-semibold text-teal-400 break-words">{plan.phase}</span>
                        <span className="text-xs text-gray-500 hidden sm:inline">•</span>
                        <span className="text-xs text-gray-400 break-words">{plan.timeline}</span>
                        <span className={`text-xs px-1.5 sm:px-2 py-0.5 rounded flex-shrink-0 ${
                          plan.priority === 'Critical' ? 'bg-red-900/30 text-red-300' :
                          plan.priority === 'High' ? 'bg-orange-900/30 text-orange-300' :
                          plan.priority === 'Medium' ? 'bg-yellow-900/30 text-yellow-300' :
                          'bg-teal-900/30 text-teal-300'
                        }`}>
                          {plan.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">{plan.businessValue}</p>
                      <p className="text-xs text-gray-400 mt-1">{plan.issues} {plan.issues === 1 ? 'priority area' : 'priority areas'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Priorities */}
            {businessView.topPriorities && businessView.topPriorities.length > 0 && (
              <div className="bg-[#0a1628]/50 rounded-lg p-4 border border-gray-700/50">
                <h4 className="text-sm font-semibold text-teal-300 mb-3">Top Priorities</h4>
                <ul className="space-y-2">
                  {businessView.topPriorities.map((priority, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-teal-400 mt-0.5">•</span>
                      <span>{priority}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Overall Score */}
        <div className="mb-6 p-4 sm:p-6 bg-[#0a1628] rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-300 mb-1">
              {mode === 'business' ? 'Web Quality Score' : 'Overall UX Score'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-400">
              {mode === 'business' 
                ? 'Evaluated against industry-standard web quality benchmarks'
                : 'Based on severity-weighted analysis'}
            </p>
          </div>
          <div className={`text-3xl sm:text-4xl md:text-5xl font-bold ${getScoreColor(result.summary.overallScore)}`}>
            {result.summary.overallScore}
          </div>
        </div>
        <div className="mt-4 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              result.summary.overallScore >= 80 ? 'bg-teal-500' :
              result.summary.overallScore >= 60 ? 'bg-yellow-500' :
              result.summary.overallScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${result.summary.overallScore}%` }}
          />
        </div>
        </div>

        {/* Severity Breakdown */}
        <div className="mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Issues by Severity</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-[#0a1628] p-4 rounded-lg text-center border border-gray-700/50">
            <div className="text-2xl sm:text-3xl font-bold text-white">{result.summary.totalIssues}</div>
            <div className="text-xs sm:text-sm text-gray-300 mt-1">Total Issues</div>
          </div>
          <div className="bg-red-900/30 p-4 rounded-lg text-center border-2 border-red-500/50">
            <div className="text-2xl sm:text-3xl font-bold text-red-300">{result.summary.critical}</div>
            <div className="text-xs sm:text-sm text-red-200 mt-1">Critical</div>
          </div>
          <div className="bg-orange-900/30 p-4 rounded-lg text-center border-2 border-orange-500/50">
            <div className="text-2xl sm:text-3xl font-bold text-orange-300">{result.summary.high}</div>
            <div className="text-xs sm:text-sm text-orange-200 mt-1">High</div>
          </div>
          <div className="bg-yellow-900/30 p-4 rounded-lg text-center border-2 border-yellow-500/50">
            <div className="text-2xl sm:text-3xl font-bold text-yellow-300">{result.summary.medium}</div>
            <div className="text-xs sm:text-sm text-yellow-200 mt-1">Medium</div>
          </div>
          <div className="bg-teal-900/30 p-4 rounded-lg text-center border-2 border-teal-500/50">
            <div className="text-2xl sm:text-3xl font-bold text-teal-300">{result.summary.low}</div>
            <div className="text-sm text-teal-200 mt-1">Low</div>
          </div>
        </div>
        </div>

        {/* Category Breakdown */}
        <div>
        <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Issues by Category</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-[#0a1628] p-4 rounded-lg text-center border border-gray-700/50 hover:border-teal-500/50 transition-colors">
            <div className="text-xl sm:text-2xl mb-2">♿</div>
            <div className="text-xl sm:text-2xl font-bold text-white">{result.summary.accessibility}</div>
            <div className="text-xs sm:text-sm text-gray-400 mt-1">Accessibility</div>
          </div>
          <div className="bg-[#0a1628] p-4 rounded-lg text-center border border-gray-700/50 hover:border-teal-500/50 transition-colors">
            <div className="text-xl sm:text-2xl mb-2">👆</div>
            <div className="text-xl sm:text-2xl font-bold text-white">{result.summary.usability}</div>
            <div className="text-xs sm:text-sm text-gray-400 mt-1">Usability</div>
          </div>
          <div className="bg-[#0a1628] p-4 rounded-lg text-center border border-gray-700/50 hover:border-teal-500/50 transition-colors">
            <div className="text-xl sm:text-2xl mb-2">🎨</div>
            <div className="text-xl sm:text-2xl font-bold text-white">{result.summary.design}</div>
            <div className="text-xs sm:text-sm text-gray-400 mt-1">Design</div>
          </div>
          <div className="bg-[#0a1628] p-4 rounded-lg text-center border border-gray-700/50 hover:border-teal-500/50 transition-colors">
            <div className="text-xl sm:text-2xl mb-2">⚡</div>
            <div className="text-xl sm:text-2xl font-bold text-white">{result.summary.performance}</div>
            <div className="text-xs sm:text-sm text-gray-400 mt-1">Performance</div>
          </div>
          <div className="bg-[#0a1628] p-4 rounded-lg text-center border border-gray-700/50 hover:border-teal-500/50 transition-colors">
            <div className="text-xl sm:text-2xl mb-2">🔍</div>
            <div className="text-xl sm:text-2xl font-bold text-white">{result.summary.seo}</div>
            <div className="text-sm text-gray-400 mt-1">SEO</div>
          </div>
        </div>
        </div>
      </div>

      {/* Full-size Screenshot Modal */}
      {showModal && result.screenshot && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-0 sm:p-4 ${
            isClosing ? 'modal-backdrop-exit' : 'modal-backdrop-enter'
          }`}
          onClick={handleCloseModal}
          style={{ zIndex: 50, height: '100vh', width: '100vw' }}
        >
          {/* Close button - positioned relative to viewport, outside screenshot */}
          <button
            onClick={handleCloseModal}
            className={`fixed top-4 sm:top-8 right-4 sm:right-8 z-20 bg-black/90 hover:bg-black text-white rounded-full p-2 sm:p-3 border-2 border-gray-600 hover:border-teal-500 transition-all ease-out shadow-lg ${
              isClosing ? 'opacity-0 scale-95 duration-350' : 'opacity-100 scale-100 hover:scale-110 duration-200'
            }`}
            style={isClosing ? { transitionDuration: '350ms' } : {}}
            aria-label="Close screenshot"
          >
            <X size={18} className="sm:w-6 sm:h-6" />
          </button>

          <div
            className={`relative max-w-7xl max-h-[90vh] sm:max-h-[90vh] h-full sm:h-auto w-full flex items-center justify-center ${
              isClosing ? 'modal-content-exit' : 'modal-content-enter'
            }`}
            onClick={(e) => e.stopPropagation()}
            style={isMobile ? { height: '100vh', maxHeight: '100vh' } : {}}
          >
            {/* Toggle Overlays Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowOverlays(!showOverlays);
              }}
              className={`fixed top-4 sm:top-8 left-4 sm:left-8 z-20 bg-black/90 hover:bg-black text-white rounded-lg px-2 sm:px-4 py-1.5 sm:py-2 border-2 border-gray-600 hover:border-teal-500 transition-all ease-out shadow-lg flex items-center gap-1 sm:gap-2 ${
                isClosing ? 'opacity-0 scale-95 duration-350' : 'opacity-100 scale-100 hover:scale-105 duration-200'
              }`}
              style={isClosing ? { transitionDuration: '350ms' } : {}}
              aria-label={showOverlays ? 'Hide problem areas' : 'Show problem areas'}
            >
              {showOverlays ? <EyeOff size={16} className="sm:w-5 sm:h-5" /> : <Eye size={16} className="sm:w-5 sm:h-5" />}
              <span className="text-xs sm:text-sm font-medium">{showOverlays ? 'Hide Issues' : 'Show Issues'}</span>
            </button>

            {/* Backdrop overlay for mobile bottom sheet */}
            {isMobile && clickedOverlay !== null && (
              <div
                className="fixed inset-0 bg-black/60"
                onClick={(e) => {
                  // Only close if clicking directly on backdrop, not on bottom sheet
                  if (e.target === e.currentTarget) {
                    e.stopPropagation();
                    setClickedOverlay(null);
                    setCurrentIssueIndex(0);
                  }
                }}
              />
            )}

            {/* Screenshot container */}
            <div 
              className="relative w-full h-full flex items-center justify-center"
              style={{ 
                zIndex: 10,
                // On mobile, when bottom sheet is open, disable pointer events so buttons are clickable
                pointerEvents: isMobile && clickedOverlay !== null ? 'none' : 'auto'
              }}
              onClick={(e) => {
                // Close overlay when clicking on image background on mobile
                if (isMobile && clickedOverlay !== null && e.target === e.currentTarget) {
                  setClickedOverlay(null);
                  setCurrentIssueIndex(0);
                }
              }}
            >
              <img
                ref={imageRef}
                src={result.screenshot}
                alt="Website screenshot - Full size"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border-4 border-gray-700"
                onLoad={() => {
                  if (imageRef.current) {
                    const rect = imageRef.current.getBoundingClientRect();
                    setImageDimensions({ width: rect.width, height: rect.height });
                  }
                }}
                onClick={(e) => {
                  // Close overlay when clicking on image on mobile
                  if (isMobile && clickedOverlay !== null) {
                    e.stopPropagation();
                    setClickedOverlay(null);
                  }
                }}
              />
              
              {/* Problem Area Overlays */}
              {showOverlays && imageDimensions.width > 0 && Object.entries(groupedFindings).map(([key, group], idx) => {
                const { position, findings, highestSeverity } = group;
                const isHovered = hoveredOverlay === idx;
                const isClicked = clickedOverlay === idx;
                const shouldShowOverlay = isMobile ? isClicked : isHovered;
                const shouldShowBox = isMobile ? isClicked : true;
                // On mobile, when bottom sheet is open, disable pointer events on inactive overlays
                const shouldDisablePointerEvents = isMobile && clickedOverlay !== null && clickedOverlay !== idx;
                
                return (
                  <div
                    key={key}
                    className="absolute transition-all duration-200"
                    style={{
                      top: `${position.top}%`,
                      left: `${position.left}%`,
                      width: `${position.width}%`,
                      height: `${position.height}%`,
                      // Mobile: Subtle static overlay instead of blinking pulse
                      backgroundColor: isMobile && isClicked 
                        ? getSeverityColor(highestSeverity).replace('0.3', '0.2') // Static, more visible
                        : shouldShowBox ? getSeverityColor(highestSeverity) : 'transparent',
                      border: isMobile && isClicked
                        ? `1px dashed ${getSeverityBorderColor(highestSeverity)}` // Dashed instead of solid
                        : shouldShowBox ? `2px solid ${getSeverityBorderColor(highestSeverity)}` : 'none',
                      borderRadius: '4px',
                      boxShadow: shouldShowOverlay ? `0 0 10px ${getSeverityBorderColor(highestSeverity)}` : 'none',
                      zIndex: shouldShowOverlay ? 15 : 10,
                      // Remove any animation that causes blinking - use static opacity
                      animation: 'none',
                      opacity: isMobile && isClicked ? 1 : undefined, // Static, no blinking
                      // Disable pointer events on inactive overlays when bottom sheet is open
                      pointerEvents: shouldDisablePointerEvents ? 'none' : 'auto',
                    }}
                    onMouseEnter={() => !isMobile && setHoveredOverlay(idx)}
                    onMouseLeave={() => !isMobile && setHoveredOverlay(null)}
                  >
                    {/* Severity Badge - Hidden on mobile */}
                    {!isMobile && (
                    <div
                      className={`absolute -top-3 -left-3 bg-black/90 px-2 py-1 rounded-md text-xs font-bold uppercase ${getSeverityTextColor(highestSeverity)} border-2`}
                      style={{ borderColor: getSeverityBorderColor(highestSeverity) }}
                    >
                      {highestSeverity}
                    </div>
                    )}
                    
                    {/* Issue Count Badge - Always visible, clickable on mobile */}
                    <div 
                      className={`absolute -top-3 -right-3 bg-black/90 text-white px-2 py-1 rounded-full text-xs font-bold border-2 border-white/50 ${isMobile ? 'cursor-pointer hover:bg-teal-600 transition-colors' : ''}`}
                      onClick={(e) => {
                        if (isMobile) {
                          e.stopPropagation();
                          setClickedOverlay(clickedOverlay === idx ? null : idx);
                          setCurrentIssueIndex(0); // Reset to first issue when opening
                        }
                      }}
                    >
                      {findings.length}
                    </div>
                    
                    {/* Hover/Click Tooltip */}
                    {shouldShowOverlay && (
                      <div
                        className={`${isMobile 
                          ? 'fixed bottom-0 left-0 right-0 w-full max-w-full shadow-2xl rounded-t-2xl' 
                          : 'absolute top-full left-0 mt-2 w-80'} bg-black/95 text-white ${isMobile ? 'p-4 pb-6' : 'p-4'} border-2 ${isMobile ? 'border-b-0' : ''} ${isMobile ? 'overflow-y-auto' : ''}`}
                        style={{ 
                          borderColor: getSeverityBorderColor(highestSeverity),
                          maxHeight: isMobile ? '70vh' : 'auto',
                          zIndex: 100, // Much higher than Hide Issues button (z-20) to ensure visibility
                          // Mobile: Fixed bottom sheet for full visibility
                          pointerEvents: 'auto', // Ensure buttons are clickable
                          ...(isMobile ? {
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            width: '100%',
                            maxWidth: '100%',
                            borderTopLeftRadius: '1rem',
                            borderTopRightRadius: '1rem',
                            borderBottomLeftRadius: 0,
                            borderBottomRightRadius: 0,
                          } : {})
                        }}
                        onMouseEnter={() => !isMobile && setHoveredOverlay(idx)}
                        onMouseLeave={() => !isMobile && setHoveredOverlay(null)}
                        onClick={(e) => {
                          // Prevent closing when clicking inside the bottom sheet
                          if (isMobile) {
                            e.stopPropagation();
                            e.preventDefault();
                          }
                        }}
                      >
                        {/* Drag handle indicator for mobile */}
                        {isMobile && (
                          <div className="flex justify-center mb-3">
                            <div className="w-12 h-1 bg-gray-600 rounded-full"></div>
                          </div>
                        )}
                        
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5">
                            <AlertCircle size={isMobile ? 14 : 16} className={getSeverityTextColor(highestSeverity)} />
                            <span className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} ${getSeverityTextColor(highestSeverity)}`}>
                              {isMobile 
                                ? `Issue ${currentIssueIndex + 1} of ${findings.length}`
                                : `${findings.length} ${findings.length === 1 ? 'Issue' : 'Issues'}`}
                            </span>
                            {/* Severity tag inside tooltip for mobile */}
                            {isMobile && (
                              <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${getSeverityTextColor(highestSeverity)} bg-black/50 border`}
                                style={{ borderColor: getSeverityBorderColor(highestSeverity) }}>
                                {highestSeverity}
                              </span>
                            )}
                          </div>
                          {isMobile && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setClickedOverlay(null);
                                setCurrentIssueIndex(0);
                              }}
                              className="text-gray-400 hover:text-white p-1"
                              aria-label="Close"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        
                        {/* Content - Different for mobile vs desktop */}
                        {isMobile ? (
                          // Mobile: Single issue view with navigation
                          <div className="relative">
                            {findings.length > 0 && (() => {
                              const currentFinding = findings[currentIssueIndex];
                              const mobileSummary = getMobileSummary(currentFinding);
                              return (
                                <div className="bg-gray-900/50 rounded-md p-3 border-l-2" 
                                  style={{ borderColor: getSeverityBorderColor(currentFinding.severity) }}>
                                  <div className="font-semibold text-xs text-white leading-tight mb-2">
                                    {mobileSummary.title}
                                  </div>
                                  <div className="text-[11px] text-gray-300 leading-snug mb-2">
                                    {mobileSummary.impact}
                                  </div>
                                  <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                    <span>📍</span>
                                    <span className="truncate">{currentFinding.location}</span>
                                  </div>
                                </div>
                              );
                            })()}
                            
                            {/* Navigation arrows */}
                            {findings.length > 1 && (
                              <div 
                                className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700"
                                style={{ pointerEvents: 'auto' }}
                                onClick={(e) => {
                                  // Prevent any clicks in navigation area from closing the sheet
                                  e.stopPropagation();
                                }}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setCurrentIssueIndex((prev) => 
                                      prev === 0 ? findings.length - 1 : prev - 1
                                    );
                                  }}
                                  onTouchStart={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                  }}
                                  onTouchEnd={(e) => {
                                    e.stopPropagation();
                                  }}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-600/20 hover:bg-teal-600/30 active:bg-teal-600/40 text-teal-300 rounded-lg transition-colors text-xs font-medium touch-manipulation"
                                  style={{ pointerEvents: 'auto', zIndex: 101 }}
                                  aria-label="Previous issue"
                                  type="button"
                                >
                                  <ChevronLeft size={14} />
                                  <span>Previous</span>
                                </button>
                                <span className="text-xs text-gray-400">
                                  {currentIssueIndex + 1} / {findings.length}
                          </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setCurrentIssueIndex((prev) => 
                                      prev === findings.length - 1 ? 0 : prev + 1
                                    );
                                  }}
                                  onTouchStart={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                  }}
                                  onTouchEnd={(e) => {
                                    e.stopPropagation();
                                  }}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-600/20 hover:bg-teal-600/30 active:bg-teal-600/40 text-teal-300 rounded-lg transition-colors text-xs font-medium touch-manipulation"
                                  style={{ pointerEvents: 'auto', zIndex: 101 }}
                                  aria-label="Next issue"
                                  type="button"
                                >
                                  <span>Next</span>
                                  <ChevronRight size={14} />
                                </button>
                              </div>
                            )}
                        </div>
                        ) : (
                          // Desktop: Full detailed view (unchanged)
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {findings.map((finding, fIdx) => (
                            <div key={fIdx} className="border-l-2 pl-3 pb-2" style={{ borderColor: getSeverityBorderColor(finding.severity) }}>
                              <div className="font-semibold text-sm text-white">{finding.issue}</div>
                              <div className="text-xs text-gray-300 mt-1">{finding.description}</div>
                              <div className="text-xs text-gray-400 mt-1">📍 {finding.location}</div>
                            </div>
                          ))}
                        </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend - Hidden on mobile */}
            {showOverlays && !isMobile && (
              <div
                className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-6 py-3 rounded-lg shadow-lg border-2 border-gray-600 z-20 transition-all ease-out ${
                  isClosing ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
                }`}
                style={{ transitionDuration: isClosing ? '350ms' : '200ms' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-xs font-semibold mb-2 text-center">Problem Area Colors</div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2" style={{ backgroundColor: getSeverityColor('critical'), borderColor: getSeverityBorderColor('critical') }}></div>
                    <span>Critical</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2" style={{ backgroundColor: getSeverityColor('high'), borderColor: getSeverityBorderColor('high') }}></div>
                    <span>High</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2" style={{ backgroundColor: getSeverityColor('medium'), borderColor: getSeverityBorderColor('medium') }}></div>
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2" style={{ backgroundColor: getSeverityColor('low'), borderColor: getSeverityBorderColor('low') }}></div>
                    <span>Low</span>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div
              className={`hidden sm:block absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm transition-all ease-out ${
                isClosing ? 'opacity-0 translate-y-4' : showOverlays ? 'opacity-0' : 'opacity-100 translate-y-0'
              }`}
              style={{ transitionDuration: isClosing ? '350ms' : '200ms' }}
            >
              Click outside or press ESC to close
            </div>
          </div>
        </div>
      )}
    </>
  );
}

