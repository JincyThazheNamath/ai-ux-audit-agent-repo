'use client';

import { useState, useEffect, useRef } from 'react';
import { Share2, Download, X, ZoomIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { AuditResult, AuditFinding } from '../types/audit';

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
  const [isHovered, setIsHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);
  const [hoveredOverlay, setHoveredOverlay] = useState<number | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

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
    }, 350); // Match animation duration (350ms)
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
      <div className="bg-[#1a2332] rounded-2xl shadow-xl p-8 border border-gray-700/50">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-white">Audit Summary</h2>
              <div className="flex gap-2">
                <button
                  onClick={onShare}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 hover:shadow-lg hover:scale-105 active:scale-100 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200"
                  title="Share Report"
                >
                  <Share2 size={16} />
                  Share
                </button>
                <button
                  onClick={onDownload}
                  className="px-4 py-2 bg-[#0a1628] hover:bg-[#0f1d35] hover:border-teal-500/50 hover:shadow-lg hover:scale-105 active:scale-100 border border-gray-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200"
                  title="Download Report"
                >
                  <Download size={16} />
                  Download
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

        {/* Overall Score */}
        <div className="mb-6 p-6 bg-[#0a1628] rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-300 mb-1">Overall UX Score</h3>
            <p className="text-sm text-gray-400">Based on severity-weighted analysis</p>
          </div>
          <div className={`text-5xl font-bold ${getScoreColor(result.summary.overallScore)}`}>
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
        <h3 className="text-lg font-semibold text-white mb-4">Issues by Severity</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-[#0a1628] p-4 rounded-lg text-center border border-gray-700/50">
            <div className="text-3xl font-bold text-white">{result.summary.totalIssues}</div>
            <div className="text-sm text-gray-300 mt-1">Total Issues</div>
          </div>
          <div className="bg-red-900/30 p-4 rounded-lg text-center border-2 border-red-500/50">
            <div className="text-3xl font-bold text-red-300">{result.summary.critical}</div>
            <div className="text-sm text-red-200 mt-1">Critical</div>
          </div>
          <div className="bg-orange-900/30 p-4 rounded-lg text-center border-2 border-orange-500/50">
            <div className="text-3xl font-bold text-orange-300">{result.summary.high}</div>
            <div className="text-sm text-orange-200 mt-1">High</div>
          </div>
          <div className="bg-yellow-900/30 p-4 rounded-lg text-center border-2 border-yellow-500/50">
            <div className="text-3xl font-bold text-yellow-300">{result.summary.medium}</div>
            <div className="text-sm text-yellow-200 mt-1">Medium</div>
          </div>
          <div className="bg-teal-900/30 p-4 rounded-lg text-center border-2 border-teal-500/50">
            <div className="text-3xl font-bold text-teal-300">{result.summary.low}</div>
            <div className="text-sm text-teal-200 mt-1">Low</div>
          </div>
        </div>
        </div>

        {/* Category Breakdown */}
        <div>
        <h3 className="text-lg font-semibold text-white mb-4">Issues by Category</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-[#0a1628] p-4 rounded-lg text-center border border-gray-700/50 hover:border-teal-500/50 transition-colors">
            <div className="text-2xl mb-2">♿</div>
            <div className="text-2xl font-bold text-white">{result.summary.accessibility}</div>
            <div className="text-sm text-gray-400 mt-1">Accessibility</div>
          </div>
          <div className="bg-[#0a1628] p-4 rounded-lg text-center border border-gray-700/50 hover:border-teal-500/50 transition-colors">
            <div className="text-2xl mb-2">👆</div>
            <div className="text-2xl font-bold text-white">{result.summary.usability}</div>
            <div className="text-sm text-gray-400 mt-1">Usability</div>
          </div>
          <div className="bg-[#0a1628] p-4 rounded-lg text-center border border-gray-700/50 hover:border-teal-500/50 transition-colors">
            <div className="text-2xl mb-2">🎨</div>
            <div className="text-2xl font-bold text-white">{result.summary.design}</div>
            <div className="text-sm text-gray-400 mt-1">Design</div>
          </div>
          <div className="bg-[#0a1628] p-4 rounded-lg text-center border border-gray-700/50 hover:border-teal-500/50 transition-colors">
            <div className="text-2xl mb-2">⚡</div>
            <div className="text-2xl font-bold text-white">{result.summary.performance}</div>
            <div className="text-sm text-gray-400 mt-1">Performance</div>
          </div>
          <div className="bg-[#0a1628] p-4 rounded-lg text-center border border-gray-700/50 hover:border-teal-500/50 transition-colors">
            <div className="text-2xl mb-2">🔍</div>
            <div className="text-2xl font-bold text-white">{result.summary.seo}</div>
            <div className="text-sm text-gray-400 mt-1">SEO</div>
          </div>
        </div>
        </div>
      </div>

      {/* Full-size Screenshot Modal */}
      {showModal && result.screenshot && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 ${
            isClosing ? 'modal-backdrop-exit' : 'modal-backdrop-enter'
          }`}
          onClick={handleCloseModal}
        >
          {/* Close button - positioned relative to viewport, outside screenshot */}
          <button
            onClick={handleCloseModal}
            className={`fixed top-8 right-8 z-20 bg-black/90 hover:bg-black text-white rounded-full p-3 border-2 border-gray-600 hover:border-teal-500 transition-all ease-out shadow-lg ${
              isClosing ? 'opacity-0 scale-95 duration-350' : 'opacity-100 scale-100 hover:scale-110 duration-200'
            }`}
            style={isClosing ? { transitionDuration: '350ms' } : {}}
            aria-label="Close screenshot"
          >
            <X size={24} />
          </button>

          <div
            className={`relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center ${
              isClosing ? 'modal-content-exit' : 'modal-content-enter'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Toggle Overlays Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowOverlays(!showOverlays);
              }}
              className={`fixed top-8 left-8 z-20 bg-black/90 hover:bg-black text-white rounded-lg px-4 py-2 border-2 border-gray-600 hover:border-teal-500 transition-all ease-out shadow-lg flex items-center gap-2 ${
                isClosing ? 'opacity-0 scale-95 duration-350' : 'opacity-100 scale-100 hover:scale-105 duration-200'
              }`}
              style={isClosing ? { transitionDuration: '350ms' } : {}}
              aria-label={showOverlays ? 'Hide problem areas' : 'Show problem areas'}
            >
              {showOverlays ? <EyeOff size={20} /> : <Eye size={20} />}
              <span className="text-sm font-medium">{showOverlays ? 'Hide Issues' : 'Show Issues'}</span>
            </button>

            {/* Screenshot container */}
            <div className="relative w-full h-full flex items-center justify-center">
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
              />
              
              {/* Problem Area Overlays */}
              {showOverlays && imageDimensions.width > 0 && Object.entries(groupedFindings).map(([key, group], idx) => {
                const { position, findings, highestSeverity } = group;
                const isHovered = hoveredOverlay === idx;
                
                return (
                  <div
                    key={key}
                    className="absolute transition-all duration-200 cursor-pointer"
                    style={{
                      top: `${position.top}%`,
                      left: `${position.left}%`,
                      width: `${position.width}%`,
                      height: `${position.height}%`,
                      backgroundColor: isHovered ? getSeverityColor(highestSeverity) : getSeverityColor(highestSeverity),
                      border: `2px solid ${getSeverityBorderColor(highestSeverity)}`,
                      borderRadius: '4px',
                      boxShadow: isHovered ? `0 0 20px ${getSeverityBorderColor(highestSeverity)}` : 'none',
                      zIndex: isHovered ? 15 : 10,
                    }}
                    onMouseEnter={() => setHoveredOverlay(idx)}
                    onMouseLeave={() => setHoveredOverlay(null)}
                  >
                    {/* Severity Badge */}
                    <div
                      className={`absolute -top-3 -left-3 bg-black/90 px-2 py-1 rounded-md text-xs font-bold uppercase ${getSeverityTextColor(highestSeverity)} border-2`}
                      style={{ borderColor: getSeverityBorderColor(highestSeverity) }}
                    >
                      {highestSeverity}
                    </div>
                    
                    {/* Issue Count Badge */}
                    <div className="absolute -top-3 -right-3 bg-black/90 text-white px-2 py-1 rounded-full text-xs font-bold border-2 border-white/50">
                      {findings.length}
                    </div>
                    
                    {/* Hover Tooltip */}
                    {isHovered && (
                      <div
                        className="absolute top-full left-0 mt-2 w-80 bg-black/95 text-white p-4 rounded-lg shadow-2xl border-2 z-30"
                        style={{ borderColor: getSeverityBorderColor(highestSeverity) }}
                        onMouseEnter={() => setHoveredOverlay(idx)}
                        onMouseLeave={() => setHoveredOverlay(null)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle size={16} className={getSeverityTextColor(highestSeverity)} />
                          <span className={`font-bold text-sm ${getSeverityTextColor(highestSeverity)}`}>
                            {findings.length} {findings.length === 1 ? 'Issue' : 'Issues'} Found
                          </span>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {findings.map((finding, fIdx) => (
                            <div key={fIdx} className="border-l-2 pl-3 pb-2" style={{ borderColor: getSeverityBorderColor(finding.severity) }}>
                              <div className="font-semibold text-sm text-white">{finding.issue}</div>
                              <div className="text-xs text-gray-300 mt-1">{finding.description}</div>
                              <div className="text-xs text-gray-400 mt-1">📍 {finding.location}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            {showOverlays && (
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
              className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm transition-all ease-out ${
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

