'use client';

import { useEffect, useState, useRef } from 'react';
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
  const [finalResultRetryCount, setFinalResultRetryCount] = useState(0);
  const [startTime] = useState(Date.now());
  const lastCompletedRef = useRef<number>(0);
  const lastProgressTimeRef = useRef<number>(Date.now());
  const resumeTriggeredRef = useRef<boolean>(false);
  const progressCheckFailureCount = useRef<number>(0);
  const MAX_RETRIES = 10; // Max retries for 404 errors
  const MAX_PROGRESS_CHECK_FAILURES = 8; // Only show error after 8 consecutive progress check failures (~12s)
  const MAX_FINAL_RESULT_RETRIES = 30; // Max retries for missing finalResult (30 * 1.5s = 45s)
  const SOFT_WARNING_TIME = 15 * 60 * 1000; // At 15 min show "still processing" notice but keep polling
  const MAX_WAIT_TIME = 25 * 60 * 1000; // 25 minutes max wait (40 pages can take 15–20+ min on Netlify)
  const STUCK_THRESHOLD_MS = 45000; // If no progress for 45s, trigger batch to resume chain

  const [longRunningNotice, setLongRunningNotice] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const pollProgress = async () => {
      try {
        const elapsed = Date.now() - startTime;
        // At 15 min: show notice but keep polling (don't call onError)
        if (elapsed >= SOFT_WARNING_TIME) {
          setLongRunningNotice(true);
        }
        // Only give up and show error after 25 minutes
        if (elapsed > MAX_WAIT_TIME) {
          const elapsedMinutes = Math.floor(elapsed / 60000);
          onError(`Audit is taking longer than expected (${elapsedMinutes} minutes). For 40 pages, audits can take up to 25 minutes on Netlify. You can keep this page open—we'll show results when ready—or start a new audit with fewer pages.`);
          return;
        }

        const url = `/api/audit/progress/${jobId}`;
        
        // Increased timeout for progress API calls (30s for Netlify, handles slow Redis queries)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort('Progress poll timeout after 30s'), 30000);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

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
        
        // Reset retry counts on successful fetch
        setRetryCount(0);
        progressCheckFailureCount.current = 0;
        
        // CRITICAL FIX: Trigger batch processing immediately when status is 'auditing' with pending pages
        // This ensures retry works even if retry API's fetch() fails
        const previousStatus = progress?.status;
        const pendingPages = data.pageResults?.filter((p: { status: string }) => p.status === 'pending' || p.status === 'processing').length || 0;
        const shouldTriggerBatch = data.status === 'auditing' && pendingPages > 0;
        
        // Trigger batch if:
        // 1. Status just changed to 'auditing' (retry was triggered)
        // 2. OR status is 'auditing' and no progress for 45s (stuck detection)
        const now = Date.now();
        const isStatusChange = previousStatus !== 'auditing' && data.status === 'auditing';
        const isStuck = data.status === 'auditing' && 
                        pendingPages > 0 && 
                        (now - lastProgressTimeRef.current) > STUCK_THRESHOLD_MS && 
                        !resumeTriggeredRef.current;
        
        if (shouldTriggerBatch && (isStatusChange || isStuck)) {
          if (isStatusChange) {
            console.log(`[Progress] ✅ Status changed to 'auditing' with ${pendingPages} pending pages - triggering batch immediately`);
            lastProgressTimeRef.current = now; // Reset timer
            resumeTriggeredRef.current = true; // Prevent duplicate triggers
          } else if (isStuck) {
            resumeTriggeredRef.current = true;
            console.log(`[Progress] ⚠️ No progress for ${(now - lastProgressTimeRef.current) / 1000}s, triggering batch to resume (${pendingPages} pending)`);
          }
          
          // Trigger batch processing
          fetch('/api/audit/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId })
          }).then((r) => {
            console.log(`[Progress] ✅ Batch trigger: ${r.ok ? 'success' : `failed (${r.status})`}`);
          }).catch((e: any) => {
            console.error('[Progress] ❌ Batch trigger failed:', e.message);
          });
        }
        
        // Update progress tracking
        if (data.completedPages !== lastCompletedRef.current) {
          lastCompletedRef.current = data.completedPages ?? 0;
          lastProgressTimeRef.current = now;
          resumeTriggeredRef.current = false; // Reset on progress
        }
        
        setProgress(data);

        if (data.status === 'completed') {
          if (data.finalResult) {
            // Reset final result retry count on success
            setFinalResultRetryCount(0);
            onComplete(data.finalResult);
          } else {
            // Audit is completed but finalResult is not yet available
            // This can happen if aggregation is still in progress
            const newFinalResultRetryCount = finalResultRetryCount + 1;
            setFinalResultRetryCount(newFinalResultRetryCount);
            
            console.warn(`Audit completed but no final result available (retry ${newFinalResultRetryCount}/${MAX_FINAL_RESULT_RETRIES})`);
            
            if (newFinalResultRetryCount >= MAX_FINAL_RESULT_RETRIES) {
              // After many retries, show error but with helpful message
              console.error('Final result not available after multiple retries');
              onError('Audit completed but results are still being aggregated. This may take a few more seconds. Please wait a moment and refresh, or try again.');
            } else {
              // Continue polling - final result might be available on next poll
              console.log(`Waiting for final result... (${newFinalResultRetryCount}/${MAX_FINAL_RESULT_RETRIES})`);
            }
          }
        } else if (data.status === 'failed') {
          const errorMessage = data.finalResult?.error || 'Audit failed. Please try again.';
          onError(errorMessage);
        } else {
          // Reset final result retry count when status changes (not completed)
          setFinalResultRetryCount(0);
        }
      } catch (error: any) {
        const msg = error?.message ?? '';
        // Don't show abort/timeout as user error - poll will retry
        const isAbortOrTimeout = msg.includes('abort') || msg.includes('aborted') || msg.includes('timeout') || msg.includes('without reason') || error?.name === 'AbortError';
        if (isAbortOrTimeout) {
          console.warn('Progress poll aborted or timed out, will retry:', msg);
          return;
        }
        // If audit already shows all pages done, don't overwrite with an error
        if (progress && progress.completedPages >= progress.totalPages && progress.totalPages > 0) {
          console.warn('Poll error after completion, ignoring:', msg);
          progressCheckFailureCount.current = 0;
          return;
        }
        // Transient progress check failures (network, 500) - retry before showing error
        if (!msg.includes('404') && !msg.includes('not found')) {
          progressCheckFailureCount.current = (progressCheckFailureCount.current || 0) + 1;
          if (progressCheckFailureCount.current >= MAX_PROGRESS_CHECK_FAILURES) {
            onError(msg || 'Failed to check progress. The audit may still be running—please wait or try again.');
            progressCheckFailureCount.current = 0;
          } else {
            console.warn(`Progress check failed (${progressCheckFailureCount.current}/${MAX_PROGRESS_CHECK_FAILURES}), retrying:`, msg);
          }
        }
      }
    };

    // Delay before first poll to ensure job is initialized
    const initialTimeout = setTimeout(() => {
      pollProgress();
    }, 1000);

    // Poll every 1.5 seconds for faster updates (optimized for small batches)
    const interval = setInterval(pollProgress, 1500);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [jobId, onComplete, onError, retryCount, finalResultRetryCount, startTime]);

  if (!progress) {
    return (
      <div className="bg-[#1a2332] rounded-2xl p-8 border border-gray-700/50">
        <div className="flex items-center gap-3 text-gray-300">
          <Loader2 className="animate-spin" size={24} />
          <div className="flex-1">
            <span className="text-lg font-semibold">Initializing audit...</span>
            {retryCount > 0 && (
              <p className="text-sm text-gray-400 mt-1">
                Waiting for job to start... (attempt {retryCount}/{MAX_RETRIES})
              </p>
            )}
            <p className="text-sm text-gray-400 mt-2">
              Please wait while we discover and prepare pages for auditing. This may take a few seconds.
            </p>
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
        const remaining = progress.totalPages - progress.completedPages;
        return `Auditing pages... (${progress.completedPages}/${progress.totalPages} completed, ${remaining} page${remaining !== 1 ? 's' : ''} remaining)`;
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
        
        {/* Processing Info */}
        {progress.status === 'auditing' && (
          <div className="bg-[#0a1628] rounded-lg p-3 border border-teal-500/20">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="animate-spin text-teal-500" size={16} />
              <span className="text-gray-300">
                Processing one page at a time (sequential processing)
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Each page takes ~20 seconds. For {progress.totalPages} pages, total time can be up to ~25 minutes on Netlify.
            </div>
            {progress.currentPage && (
              <div className="mt-2 text-xs text-teal-400">
                Currently auditing: {progress.currentPage}
              </div>
            )}
          </div>
        )}

        {/* Long-running notice: keep polling, don't treat as error */}
        {longRunningNotice && progress.status !== 'completed' && progress.status !== 'failed' && (
          <div className="rounded-lg p-4 border border-amber-500/40 bg-amber-500/10">
            <div className="flex items-start gap-2 text-amber-200">
              <Clock size={20} className="flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium">Still processing</span>
                <p className="mt-1 text-amber-200/90">
                  Large audits (e.g. 40 pages) can take 15–25 minutes on Netlify. Keep this page open—we&apos;ll show results as soon as they&apos;re ready.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Page List */}
        {progress.pageResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-300">
              Page Status ({progress.pageResults.length} total)
            </h4>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {progress.pageResults.map((page, index) => {
                // Already audited = completed status OR has a score (successful audit) → green check
                const hasScore = page.score !== undefined && page.score !== null;
                const isCompleted = page.status === 'completed' || hasScore;
                const isFailed = page.status === 'failed' && !hasScore;
                return (
                <div
                  key={index}
                  className="flex items-center gap-2 text-xs bg-[#0a1628] rounded p-2"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="text-green-500 flex-shrink-0" size={14} aria-label="Completed" />
                  ) : isFailed ? (
                    <XCircle className="text-red-500 flex-shrink-0" size={14} aria-label="Failed" />
                  ) : page.status === 'processing' ? (
                    <Loader2 className="animate-spin text-teal-500 flex-shrink-0" size={14} aria-label="Processing" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-gray-600 flex-shrink-0" aria-label="Pending" />
                  )}
                  <span className="text-gray-400 truncate flex-1">{page.url}</span>
                  {hasScore && (
                    <span className="text-teal-500 font-medium">{page.score}</span>
                  )}
                </div>
              );})}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



