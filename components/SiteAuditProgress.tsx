'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ProgressData {
  jobId: string;
  status: 'discovering' | 'auditing' | 'aggregating' | 'completed' | 'failed';
  totalPages: number;
  completedPages: number;
  currentPage?: string;
  percentage: number;
  estimatedTimeLeft: number;
  estimatedTimeLeftFormatted: string;
  pageResults: Array<{
    url: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    score?: number;
  }>;
}

interface SiteAuditProgressProps {
  jobId: string;
  onComplete: (result: any) => void;
  onError: (error: string) => void;
}

export default function SiteAuditProgress({ jobId, onComplete, onError }: SiteAuditProgressProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [startTime] = useState(Date.now());
  const MAX_RETRIES = 10; // Max retries for 404 errors
  const MAX_WAIT_TIME = 10 * 60 * 1000; // 10 minutes max wait time (extended for 40 pages)

  useEffect(() => {
    if (!jobId) return;

    const pollProgress = async () => {
      try {
        // Check if we've exceeded max wait time
        const elapsed = Date.now() - startTime;
        if (elapsed > MAX_WAIT_TIME) {
          onError('Audit is taking longer than expected (10 minutes). The audit may still be processing. Please wait a bit longer or try again with fewer pages.');
          return;
        }

        const url = `/api/audit/progress/${jobId}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          
          // If job not found, increment retry count
          if (response.status === 404) {
            const newRetryCount = retryCount + 1;
            setRetryCount(newRetryCount);
            
            // If we've retried too many times, show error
            if (newRetryCount >= MAX_RETRIES) {
              onError(data.message || 'Job not found after multiple attempts. Please try starting a new audit.');
              return;
            }
            
            // Otherwise, just retry on next poll
            console.log(`Job not found (attempt ${newRetryCount}/${MAX_RETRIES}), retrying...`);
            return;
          }
          
          // For other errors, throw immediately
          throw new Error(data.error || `Failed to fetch progress (${response.status})`);
        }

        const data = await response.json();
        
        // Reset retry count on successful fetch
        setRetryCount(0);
        setProgress(data);

        if (data.status === 'completed') {
          if (data.finalResult) {
            onComplete(data.finalResult);
          } else {
            console.warn('Audit completed but no final result available');
            onError('Audit completed but results are missing. Please try again.');
          }
        } else if (data.status === 'failed') {
          const errorMessage = data.finalResult?.error || 'Audit failed. Please try again.';
          onError(errorMessage);
        }
      } catch (error: any) {
        console.error('Progress poll error:', error);
        
        // Only call onError for non-retryable errors
        if (!error.message?.includes('404') && !error.message?.includes('not found')) {
          onError(error.message || 'Failed to check progress');
        }
      }
    };

    // Delay before first poll to ensure job is initialized
    const initialTimeout = setTimeout(() => {
      pollProgress();
    }, 1000);

    // Poll every 2 seconds after initial delay
    const interval = setInterval(pollProgress, 2000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [jobId, onComplete, onError, retryCount, startTime]);

  if (!progress) {
    return (
      <div className="bg-[#1a2332] rounded-2xl p-8 border border-gray-700/50">
        <div className="flex items-center gap-3 text-gray-300">
          <Loader2 className="animate-spin" size={24} />
          <div className="flex-1">
            <span>Initializing audit...</span>
            {retryCount > 0 && (
              <p className="text-sm text-gray-400 mt-1">
                Waiting for job to start... (attempt {retryCount}/{MAX_RETRIES})
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircle2 className="text-green-500" size={24} />;
      case 'failed':
        return <XCircle className="text-red-500" size={24} />;
      default:
        return <Loader2 className="animate-spin text-teal-500" size={24} />;
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case 'discovering':
        return 'Discovering pages...';
      case 'auditing':
        return `Auditing pages... (${progress.completedPages}/${progress.totalPages})`;
      case 'aggregating':
        return 'Aggregating results...';
      case 'completed':
        return 'Audit completed!';
      case 'failed':
        return 'Audit failed';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="bg-[#1a2332] rounded-2xl p-6 sm:p-8 border border-gray-700/50">
      <div className="space-y-6">
        {/* Status Header */}
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white">{getStatusText()}</h3>
            {progress.currentPage && (
              <p className="text-sm text-gray-400 mt-1 truncate">
                Current: {progress.currentPage}
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Progress</span>
            <span className="text-white font-medium">{progress.percentage}%</span>
          </div>
          <div className="w-full bg-[#0a1628] rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-teal-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#0a1628] rounded-lg p-3">
            <div className="text-2xl font-bold text-white">{progress.completedPages}</div>
            <div className="text-xs text-gray-400">Completed</div>
          </div>
          <div className="bg-[#0a1628] rounded-lg p-3">
            <div className="text-2xl font-bold text-white">{progress.totalPages - progress.completedPages}</div>
            <div className="text-xs text-gray-400">Remaining</div>
          </div>
          <div className="bg-[#0a1628] rounded-lg p-3">
            <div className="text-2xl font-bold text-white">{progress.totalPages}</div>
            <div className="text-xs text-gray-400">Total Pages</div>
          </div>
          <div className="bg-[#0a1628] rounded-lg p-3">
            <div className="flex items-center gap-1">
              <Clock className="text-teal-500" size={16} />
              <div>
                <div className="text-lg font-bold text-white">
                  {progress.estimatedTimeLeftFormatted || '--'}
                </div>
                <div className="text-xs text-gray-400">Est. Time Left</div>
              </div>
            </div>
          </div>
        </div>

        {/* Page List */}
        {progress.pageResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-300">Page Status</h4>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {progress.pageResults.slice(0, 10).map((page, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-xs bg-[#0a1628] rounded p-2"
                >
                  {page.status === 'completed' && (
                    <CheckCircle2 className="text-green-500 flex-shrink-0" size={14} />
                  )}
                  {page.status === 'processing' && (
                    <Loader2 className="animate-spin text-teal-500 flex-shrink-0" size={14} />
                  )}
                  {page.status === 'pending' && (
                    <div className="w-3 h-3 rounded-full bg-gray-600 flex-shrink-0" />
                  )}
                  {page.status === 'failed' && (
                    <XCircle className="text-red-500 flex-shrink-0" size={14} />
                  )}
                  <span className="text-gray-400 truncate flex-1">{page.url}</span>
                  {page.score !== undefined && (
                    <span className="text-teal-500 font-medium">{page.score}</span>
                  )}
                </div>
              ))}
              {progress.pageResults.length > 10 && (
                <div className="text-xs text-gray-500 text-center py-2">
                  +{progress.pageResults.length - 10} more pages
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



