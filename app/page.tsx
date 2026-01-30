'use client';

import { useState, useMemo, lazy, Suspense, memo } from 'react';
import { Search, Loader2, AlertCircle, Globe, FileText } from 'lucide-react';
import { generateSampleComMockData, generateDefaultMockData, generateMockResult } from '../lib/mockData';
import { AuditResult } from '../types/audit';
import { downloadReportAsHTML, openReportForPrint } from '../components/ReportGenerator';
import { ViewModeProvider, useViewMode } from '../contexts/ViewModeContext';
import ViewModeSwitcher from '../components/ViewModeSwitcher';
import SiteAuditProgress from '../components/SiteAuditProgress';
import SiteOverview from '../components/SiteOverview';

// Lazy load heavy components to reduce initial bundle size
// Using dynamic imports with explicit chunk names for better webpack chunking
const AuditFindingCard = lazy(() => 
  import(/* webpackChunkName: "audit-finding-card" */ '../components/AuditFindingCard')
);
const SummaryCard = lazy(() => 
  import(/* webpackChunkName: "summary-card" */ '../components/SummaryCard')
);
const FilterDropdown = lazy(() => 
  import(/* webpackChunkName: "filter-dropdown" */ '../components/FilterDropdown')
);

function HomeContent() {
  const { mode } = useViewMode();
  const [url, setUrl] = useState('');
  const [auditMode, setAuditMode] = useState<'single' | 'full-site'>('single');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [expandedFindings, setExpandedFindings] = useState<Set<number>>(new Set());
  
  // Full-site audit state
  const [siteAuditJobId, setSiteAuditJobId] = useState<string | null>(null);
  const [siteAuditResult, setSiteAuditResult] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'page'>('overview');
  const [selectedPageResult, setSelectedPageResult] = useState<AuditResult | null>(null);

  // Mock data generation moved to lib/mockData.ts to prevent recreation on every render
  const generateMockData = (url: string): AuditResult => {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlLower = normalizedUrl.toLowerCase();
    
    // Check if URL is sample.com and use specific mock data
    if (urlLower.includes('sample.com')) {
      const mockFindings = generateSampleComMockData();
      return generateMockResult(normalizedUrl, mockFindings);
    }
    
    // Default mock data for example.com and other URLs
    const mockFindings = generateDefaultMockData();
    return generateMockResult(normalizedUrl, mockFindings);
  };

  const handleAudit = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setError('');
    setExpandedFindings(new Set());

    if (auditMode === 'single') {
      // Single page audit
      setLoading(true);
      setResult(null);
      setSiteAuditJobId(null);
      setSiteAuditResult(null);
      setViewMode('overview');

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Audit failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to perform audit');
    } finally {
      setLoading(false);
    }
    } else {
      // Full-site audit
      setLoading(true);
      setResult(null);
      setSiteAuditResult(null);
      setViewMode('overview');

      try {
        const response = await fetch('/api/audit/site', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, maxPages: 40, maxDepth: 3 }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to start full-site audit');
        }

        setSiteAuditJobId(data.jobId);
        // Keep loading true - SiteAuditProgress component will handle the loading state
        // setLoading(false) will be called by handleSiteAuditComplete or handleSiteAuditError
      } catch (err: any) {
        setError(err.message || 'Failed to start full-site audit');
        setLoading(false);
        setSiteAuditJobId(null);
      }
    }
  };

  const handleSiteAuditComplete = (result: any) => {
    setSiteAuditResult(result);
    setLoading(false);
    setViewMode('overview');
  };

  const handleSiteAuditError = (error: string) => {
    setError(error);
    setLoading(false);
    setSiteAuditJobId(null);
  };

  const handlePageClick = (pageResult: AuditResult) => {
    setSelectedPageResult(pageResult);
    setViewMode('page');
    setResult(pageResult); // Set as current result for single-page view
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    setSelectedPageResult(null);
    setResult(null);
  };

  const handleRetryFailedPages = async (urls: string[]) => {
    if (urls.length === 0) return;
    
    // Don't clear results - we want to keep the existing job and results
    // Just reset failed pages to pending in the existing job
    if (!siteAuditJobId) {
      setError('No active audit job found. Please start a new audit first.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log(`[Retry] Retrying ${urls.length} failed pages in job: ${siteAuditJobId}`);
      console.log(`[Retry] URLs:`, urls);
      
      // Use the retry endpoint to update existing job
      const response = await fetch('/api/audit/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          jobId: siteAuditJobId,
          retryUrls: urls,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to retry failed pages');
      }

      console.log(`[Retry] ✅ Retry initiated: ${data.resetCount} pages reset to pending`);
      
      // Clear the result to show progress again
      setSiteAuditResult(null);
      setViewMode('overview');
      setLoading(false);
      
      // Progress component will automatically start polling since siteAuditJobId is still set
    } catch (err: any) {
      console.error(`[Retry] Error:`, err);
      setError(err.message || 'Failed to retry failed pages');
      setLoading(false);
    }
  };

  const toggleFinding = (index: number) => {
    const newExpanded = new Set(expandedFindings);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedFindings(newExpanded);
  };

  const filteredFindings = useMemo(() => {
    if (!result) return [];
    return result.findings.filter(finding => {
      const categoryMatch = filterCategory === 'all' || finding.category === filterCategory;
      const severityMatch = filterSeverity === 'all' || finding.severity === filterSeverity;
      return categoryMatch && severityMatch;
    });
  }, [result, filterCategory, filterSeverity]);


  const generateShareableReport = () => {
    if (!result) return '';

    const report = `
UX AUDIT REPORT
================

Website: ${result.url}
Date: ${new Date(result.timestamp).toLocaleString()}
Overall Score: ${result.summary.overallScore}/100

SUMMARY
-------
Total Issues: ${result.summary.totalIssues}
  - Critical: ${result.summary.critical}
  - High: ${result.summary.high}
  - Medium: ${result.summary.medium}
  - Low: ${result.summary.low}

By Category:
  - Accessibility: ${result.summary.accessibility}
  - Usability: ${result.summary.usability}
  - Design: ${result.summary.design}
  - Performance: ${result.summary.performance}
  - SEO: ${result.summary.seo}

DETAILED FINDINGS
-----------------
${result.findings.map((finding, index) => `
${index + 1}. ${finding.issue.toUpperCase()}
   Category: ${finding.category} | Severity: ${finding.severity}
   Location: ${finding.location}
   
   Description: ${finding.description}
   
   Suggestion: ${finding.suggestion}
   ${finding.codeSnippet ? `\n   Code Example:\n   ${finding.codeSnippet}` : ''}
`).join('\n')}

---
Generated by AI UX Audit Agent
Report ID: ${result.timestamp}
    `.trim();

    return report;
  };

  const downloadReport = () => {
    if (!result) return;
    downloadReportAsHTML(result, mode);
  };

  const shareReport = async () => {
    if (!result) return;
    // Open report in new window for printing/PDF
    openReportForPrint(result, mode);
  };

  return (
    <div className="min-h-screen bg-[#0a1628] overflow-x-hidden flex flex-col sm:!block">
        <div className="container mx-auto px-4 py-8 max-w-7xl flex-1 sm:!flex-none flex flex-col sm:!block">
        {/* Header */}
          <div className="text-center mb-6 sm:mb-8 md:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
            AI UX Audit Agent
          </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-300 max-w-2xl mx-auto px-4">
            Automated UX analysis powered by AI. Get instant insights on accessibility, 
            usability, design consistency, and more.
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-[#1a2332] rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 border border-gray-700/50">
          {/* Report style: Professional / Business */}
          <div className="mb-6">
            <ViewModeSwitcher />
          </div>
          {/* Audit Mode Selector: Single Page / Full Site */}
          <div className="flex gap-2 mb-4 p-1 bg-[#0a1628] rounded-lg">
            <button
              onClick={() => {
                setAuditMode('single');
                setResult(null);
                setSiteAuditJobId(null);
                setSiteAuditResult(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
                auditMode === 'single'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FileText size={18} />
              <span className="text-sm font-medium">Single Page</span>
            </button>
            <button
              onClick={() => {
                setAuditMode('full-site');
                setResult(null);
                setSiteAuditJobId(null);
                setSiteAuditResult(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
                auditMode === 'full-site'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Globe size={18} />
              <span className="text-sm font-medium">Full Site</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !loading && handleAudit()}
                placeholder={auditMode === 'single' ? 'Enter website URL' : 'Enter website URL (up to 40 pages)'}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 text-[16px] sm:text-lg bg-[#0a1628] border-2 border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                style={{ fontSize: '16px' }}
                disabled={loading}
              />
            </div>
            <button
              onClick={handleAudit}
              disabled={loading}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-[#14b8a6] text-white rounded-xl font-semibold hover:bg-[#0d9488] disabled:bg-teal-800 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span className="text-sm sm:text-base">Analyzing...</span>
                </>
              ) : (
                <>
                  <Search size={20} />
                  <span className="text-sm sm:text-base">
                    {auditMode === 'single' ? 'Audit Page' : 'Audit Full Site'}
                  </span>
                </>
              )}
            </button>
          </div>
          {error && (
            <div className={`mt-4 p-4 rounded-lg flex items-start gap-2 ${
              error.includes('taking longer than expected')
                ? 'bg-amber-900/20 border border-amber-500/50 text-amber-200'
                : 'bg-red-900/30 border border-red-500/50 text-red-300'
            }`}>
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                {error.includes('taking longer than expected') ? (
                  <>
                    <span className="font-semibold">Note:</span>
                    <span className="ml-2">{error}</span>
                    <p className="text-sm mt-2 opacity-90">
                      You can keep this page open—results will appear when ready—or start a new audit with fewer pages.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="font-semibold">Error:</span>
                    <span className="ml-2">{error}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Full-Site Audit Progress */}
        {siteAuditJobId && !siteAuditResult && (
          <SiteAuditProgress
            jobId={siteAuditJobId}
            onComplete={handleSiteAuditComplete}
            onError={handleSiteAuditError}
          />
        )}

        {/* Full-Site Audit Results */}
        {siteAuditResult && viewMode === 'overview' && (
          <div className="space-y-6">
            <SiteOverview
              aggregatedResult={siteAuditResult.aggregated}
              sortedPages={siteAuditResult.sortedPages}
              failedPages={siteAuditResult.failedPages || []}
              onPageClick={handlePageClick}
              onRetryFailedPages={handleRetryFailedPages}
            />
          </div>
        )}

        {/* Single Page Results or Selected Page from Full-Site */}
        {result && (auditMode === 'single' || viewMode === 'page') && (
          <div className="space-y-6">
            {viewMode === 'page' && (
              <button
                onClick={handleBackToOverview}
                className="text-teal-400 hover:text-teal-300 text-sm flex items-center gap-2 mb-4"
              >
                ← Back to Site Overview
              </button>
            )}
            {/* Summary Card */}
            <Suspense fallback={<div className="bg-[#1a2332] rounded-2xl p-8 animate-pulse">Loading summary...</div>}>
              <SummaryCard
                result={result}
                onShare={shareReport}
                onDownload={downloadReport}
              />
            </Suspense>

            {/* Findings */}
            <div className="bg-[#1a2332] rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 border border-gray-700/50">
              <Suspense fallback={<div className="animate-pulse">Loading filters...</div>}>
                <FilterDropdown
                  filterCategory={filterCategory}
                  filterSeverity={filterSeverity}
                  onCategoryChange={setFilterCategory}
                  onSeverityChange={setFilterSeverity}
                  filteredCount={filteredFindings.length}
                />
              </Suspense>

              {filteredFindings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No findings match the selected filters.</p>
                  <button
                    onClick={() => {
                      setFilterCategory('all');
                      setFilterSeverity('all');
                    }}
                    className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <Suspense fallback={<div className="space-y-4"><div className="animate-pulse h-32 bg-[#0a1628] rounded-xl"></div></div>}>
                  <div className="space-y-4">
                    {filteredFindings.map((finding, index) => {
                      const originalIndex = result.findings.indexOf(finding);
                      const isExpanded = expandedFindings.has(originalIndex);
                      return (
                        <AuditFindingCard
                          key={originalIndex}
                          finding={finding}
                          index={originalIndex}
                          isExpanded={isExpanded}
                          onToggle={() => toggleFinding(originalIndex)}
                        />
                      );
                    })}
                  </div>
                </Suspense>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
          <div className="text-center mt-8 sm:mt-12 pt-8 sm:pt-0 text-gray-400 flex-shrink-0 sm:!flex-none">
            <p className="text-xs sm:text-base">Powered by AI • Built for Lunim Studio</p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ViewModeProvider>
      <HomeContent />
    </ViewModeProvider>
  );
}
