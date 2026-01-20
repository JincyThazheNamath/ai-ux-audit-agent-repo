'use client';

import { useState } from 'react';
import { ExternalLink, AlertTriangle, TrendingUp, BarChart3, XCircle, RefreshCw, Clock, Wifi, Server, Zap, Download } from 'lucide-react';
import { AggregatedAuditResult, PageAuditResult } from '../lib/batchAuditor';
import { AuditResult } from '../types/audit';
import { useViewMode } from '../contexts/ViewModeContext';
import { downloadFullSiteReportAsHTML } from './ReportGenerator';

interface FailedPage {
  url: string;
  error: string;
  errorType: 'timeout' | 'network' | 'rate_limit' | 'browser' | 'api' | 'unknown';
  retryable: boolean;
}

interface SiteOverviewProps {
  aggregatedResult: AggregatedAuditResult;
  sortedPages: PageAuditResult[];
  failedPages?: FailedPage[];
  onPageClick: (result: AuditResult) => void;
  onRetryFailedPages?: (urls: string[]) => void;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
};

const getScoreBgColor = (score: number) => {
  if (score >= 80) return 'bg-green-500/20 border-green-500/50';
  if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/50';
  if (score >= 40) return 'bg-orange-500/20 border-orange-500/50';
  return 'bg-red-500/20 border-red-500/50';
};

const getErrorIcon = (errorType: FailedPage['errorType']) => {
  switch (errorType) {
    case 'timeout':
      return <Clock className="text-orange-500" size={16} />;
    case 'network':
      return <Wifi className="text-red-500" size={16} />;
    case 'rate_limit':
      return <Zap className="text-yellow-500" size={16} />;
    case 'browser':
      return <Server className="text-purple-500" size={16} />;
    case 'api':
      return <AlertTriangle className="text-red-500" size={16} />;
    default:
      return <XCircle className="text-gray-500" size={16} />;
  }
};

const getErrorColor = (errorType: FailedPage['errorType']) => {
  switch (errorType) {
    case 'timeout':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    case 'network':
      return 'text-red-400 bg-red-500/10 border-red-500/30';
    case 'rate_limit':
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    case 'browser':
      return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
    case 'api':
      return 'text-red-400 bg-red-500/10 border-red-500/30';
    default:
      return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  }
};

export default function SiteOverview({ aggregatedResult, sortedPages, failedPages = [], onPageClick, onRetryFailedPages }: SiteOverviewProps) {
  const { mode } = useViewMode();
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [retryingUrls, setRetryingUrls] = useState<Set<string>>(new Set());

  const handlePageClick = (pageResult: PageAuditResult) => {
    setSelectedPage(pageResult.url);
    onPageClick(pageResult.result);
  };

  const handleRetry = async (url: string) => {
    if (!onRetryFailedPages) return;
    
    setRetryingUrls(prev => new Set(prev).add(url));
    try {
      await onRetryFailedPages([url]);
    } finally {
      setRetryingUrls(prev => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
    }
  };

  const handleRetryAll = async () => {
    if (!onRetryFailedPages || failedPages.length === 0) return;
    
    const retryableUrls = failedPages.filter(f => f.retryable).map(f => f.url);
    if (retryableUrls.length === 0) return;
    
    setRetryingUrls(new Set(retryableUrls));
    try {
      await onRetryFailedPages(retryableUrls);
    } finally {
      setRetryingUrls(new Set());
    }
  };

  return (
    <div className="space-y-6">
      {/* Site-wide Summary */}
      <div className="bg-[#1a2332] rounded-2xl p-6 sm:p-8 border border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-teal-500" size={24} />
            <h2 className="text-2xl font-bold text-white">Site-Wide Overview</h2>
          </div>
          <button
            onClick={() => downloadFullSiteReportAsHTML(aggregatedResult, sortedPages, failedPages, mode)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded-lg transition-colors"
          >
            <Download className="size-4" />
            <span className="text-sm font-medium">Export Report</span>
          </button>
        </div>

        {/* Overall Score */}
        <div className={`rounded-xl p-6 mb-6 border-2 ${getScoreBgColor(aggregatedResult.aggregatedSummary.overallScore)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Overall Site Quality Score</p>
              <p className={`text-4xl sm:text-5xl font-bold ${getScoreColor(aggregatedResult.aggregatedSummary.overallScore)}`}>
                {aggregatedResult.aggregatedSummary.overallScore}
              </p>
              <p className="text-sm text-gray-400 mt-1">out of 100</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Average Score</p>
              <p className={`text-2xl font-semibold ${getScoreColor(aggregatedResult.aggregatedSummary.averageScore)}`}>
                {aggregatedResult.aggregatedSummary.averageScore}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {aggregatedResult.aggregatedSummary.totalPages} pages audited
              </p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <div className="bg-[#0a1628] rounded-lg p-4">
            <div className="text-2xl font-bold text-red-400">{aggregatedResult.aggregatedSummary.critical}</div>
            <div className="text-xs text-gray-400 mt-1">Critical</div>
          </div>
          <div className="bg-[#0a1628] rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-400">{aggregatedResult.aggregatedSummary.high}</div>
            <div className="text-xs text-gray-400 mt-1">High</div>
          </div>
          <div className="bg-[#0a1628] rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400">{aggregatedResult.aggregatedSummary.medium}</div>
            <div className="text-xs text-gray-400 mt-1">Medium</div>
          </div>
          <div className="bg-[#0a1628] rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{aggregatedResult.aggregatedSummary.low}</div>
            <div className="text-xs text-gray-400 mt-1">Low</div>
          </div>
          <div className="bg-[#0a1628] rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{aggregatedResult.aggregatedSummary.totalIssues}</div>
            <div className="text-xs text-gray-400 mt-1">Total Issues</div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-[#0a1628] rounded-lg p-4 text-center">
            <div className="text-xl font-bold text-white">{aggregatedResult.aggregatedSummary.accessibility}</div>
            <div className="text-xs text-gray-400 mt-1">Accessibility</div>
          </div>
          <div className="bg-[#0a1628] rounded-lg p-4 text-center">
            <div className="text-xl font-bold text-white">{aggregatedResult.aggregatedSummary.usability}</div>
            <div className="text-xs text-gray-400 mt-1">Usability</div>
          </div>
          <div className="bg-[#0a1628] rounded-lg p-4 text-center">
            <div className="text-xl font-bold text-white">{aggregatedResult.aggregatedSummary.design}</div>
            <div className="text-xs text-gray-400 mt-1">Design</div>
          </div>
          <div className="bg-[#0a1628] rounded-lg p-4 text-center">
            <div className="text-xl font-bold text-white">{aggregatedResult.aggregatedSummary.performance}</div>
            <div className="text-xs text-gray-400 mt-1">Performance</div>
          </div>
          <div className="bg-[#0a1628] rounded-lg p-4 text-center">
            <div className="text-xl font-bold text-white">{aggregatedResult.aggregatedSummary.seo}</div>
            <div className="text-xs text-gray-400 mt-1">SEO</div>
          </div>
        </div>
      </div>

      {/* Pages List Sorted by Severity */}
      <div className="bg-[#1a2332] rounded-2xl p-6 sm:p-8 border border-gray-700/50">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="text-orange-500" size={24} />
          <h2 className="text-2xl font-bold text-white">Pages by Severity</h2>
          <span className="text-sm text-gray-400">(Worst First)</span>
        </div>

        <div className="space-y-2">
          {sortedPages.map((pageResult, index) => {
            const isSelected = selectedPage === pageResult.url;
            return (
              <button
                key={index}
                onClick={() => handlePageClick(pageResult)}
                className={`w-full text-left bg-[#0a1628] rounded-lg p-4 hover:bg-[#0f1729] transition-colors border-2 ${
                  isSelected ? 'border-teal-500' : 'border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-gray-500 bg-gray-700/50 px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                      <span className="text-sm text-gray-400 truncate">{pageResult.url}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className={`font-semibold ${getScoreColor(pageResult.score)}`}>
                        Score: {pageResult.score}
                      </span>
                      {pageResult.criticalCount > 0 && (
                        <span className="text-red-400">● {pageResult.criticalCount} Critical</span>
                      )}
                      {pageResult.highCount > 0 && (
                        <span className="text-orange-400">● {pageResult.highCount} High</span>
                      )}
                      <span className="text-gray-500">{pageResult.totalIssues} issues</span>
                    </div>
                  </div>
                  <ExternalLink className="text-teal-500 flex-shrink-0 ml-4" size={20} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Failed Pages Section */}
      {failedPages.length > 0 && (
        <div className="bg-[#1a2332] rounded-2xl p-6 sm:p-8 border border-red-500/30">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <XCircle className="text-red-500" size={24} />
              <h2 className="text-2xl font-bold text-white">Failed Pages</h2>
              <span className="text-sm text-gray-400">({failedPages.length})</span>
            </div>
            {failedPages.some(f => f.retryable) && onRetryFailedPages && (
              <button
                onClick={handleRetryAll}
                disabled={retryingUrls.size > 0}
                className="flex items-center gap-2 px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`size-4 ${retryingUrls.size > 0 ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">Retry All</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {failedPages.map((failedPage, index) => {
              const isRetrying = retryingUrls.has(failedPage.url);
              return (
                <div
                  key={index}
                  className={`bg-[#0a1628] rounded-lg p-4 border ${getErrorColor(failedPage.errorType)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getErrorIcon(failedPage.errorType)}
                        <span className="text-xs font-semibold uppercase">{failedPage.errorType.replace('_', ' ')}</span>
                        {!failedPage.retryable && (
                          <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded">Not Retryable</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 truncate mb-1">{failedPage.url}</p>
                      <p className="text-xs text-gray-400">{failedPage.error}</p>
                    </div>
                    {failedPage.retryable && onRetryFailedPages && (
                      <button
                        onClick={() => handleRetry(failedPage.url)}
                        disabled={isRetrying}
                        className="flex items-center gap-2 px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        <RefreshCw className={`size-4 ${isRetrying ? 'animate-spin' : ''}`} />
                        <span>{isRetrying ? 'Retrying...' : 'Retry'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}





