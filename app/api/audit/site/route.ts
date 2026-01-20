import { NextRequest, NextResponse } from 'next/server';
import { discoverPagesWithDepth } from '../../../../lib/crawler';
import { aggregateAuditResults, sortPagesBySeverity } from '../../../../lib/batchAuditor';
import { createProgressTracker, updateStatus, getProgress, getAllJobs, debugProgressStore, updatePageProgress } from '../../../../lib/progressTracker';
import { processBatches, FailedPage } from '../../../../lib/batchProcessor';
import { generateMockPages, generateMockAuditForPage } from '../../../../lib/mockData';

// Simple UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function POST(request: NextRequest) {
  try {
    const { url, maxPages = 40, maxDepth = 3, useMockData = false } = await request.json();
    
    // Check environment variable for mock data mode
    const forceMockData = process.env.USE_MOCK_DATA === 'true' || useMockData;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Generate job ID
    const jobId = generateUUID();

    // Initialize progress tracker immediately (before async operation)
    // This ensures the job exists for polling even before discovery starts
    const initialProgress = await createProgressTracker(jobId, 1); // Temporary, will be updated
    initialProgress.pageResults = [{
      url: targetUrl.toString(),
      status: 'pending' as const,
    }];
    await updateStatus(jobId, 'discovering');
    
    // Verify job was created and can be retrieved immediately
    const verifyJob = await getProgress(jobId);
    if (!verifyJob) {
      console.error('❌ CRITICAL: Job not found immediately after creation');
      debugProgressStore();
      return NextResponse.json(
        { error: 'Failed to initialize audit job' },
        { status: 500 }
      );
    }
    
    console.log('✅ Job created and verified:', jobId);
    console.log('   Job status:', verifyJob.status);
    console.log('   Total pages:', verifyJob.totalPages);
    debugProgressStore();

    // Start page discovery and audit process in background
    (async () => {
      try {
        // Step 1: Discover pages
        console.log(`🔍 Discovering pages for ${targetUrl.toString()}...`);
        
        const discoveredPages = await discoverPagesWithDepth(targetUrl.toString(), {
          maxPages,
          maxDepth,
        });
        
        const pageUrls = discoveredPages.map(page => page.url);
        const actualPageCount = Math.min(pageUrls.length, maxPages);
        
        console.log(`✅ Discovered ${actualPageCount} pages`);
        
        // Update progress tracker with discovered pages
        const progress = await getProgress(jobId);
        if (!progress) {
          console.error('❌ CRITICAL: Job not found after discovery');
          return;
        }
        
        progress.totalPages = actualPageCount;
        progress.pageResults = pageUrls.slice(0, actualPageCount).map(url => ({
          url,
          status: 'pending' as const,
        }));
        
        // Save updated progress
        await updateStatus(jobId, 'auditing');
        
        console.log('✅ Updated job with', actualPageCount, 'pages');
        debugProgressStore();

        // Step 2: Process pages in batches (or use mock data if enabled)
        
        let successful: any[] = [];
        let failed: FailedPage[] = [];
        
        if (forceMockData) {
          console.log(`⚠️ Using mock data mode (testing)`);
          const mockPages = generateMockPages(targetUrl.toString(), Math.min(actualPageCount, 10));
          
          for (let i = 0; i < mockPages.length; i++) {
            const pageUrl = mockPages[i];
            await updatePageProgress(jobId, pageUrl, 'processing');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const mockResult = generateMockAuditForPage(pageUrl);
            successful.push(mockResult);
            await updatePageProgress(jobId, pageUrl, 'completed', mockResult.summary.overallScore);
          }
        } else {
          console.log(`🔄 Starting batch processing for ${actualPageCount} pages...`);
          
          try {
            const batchResult = await processBatches(
              pageUrls.slice(0, actualPageCount),
              jobId,
              {
                batchSize: 3, // Reduced from 8 to 3 to avoid overwhelming browser/API
                delayBetweenBatches: 2000, // Increased from 1000 to 2000ms
                delayBetweenRequests: 1000, // Increased from 200 to 1000ms for sequential processing
                maxRetries: 3, // Increased from 2 to 3
                timeoutPerPage: 60000, // Increased from 30000 to 60000ms (60s) for slow pages
              }
            );
            
            successful = batchResult.successful;
            failed = batchResult.failed;
            
            console.log(`✅ Batch processing completed: ${successful.length} successful, ${failed.length} failed`);
          } catch (batchError: any) {
            console.error('❌ Batch processing error:', batchError);
            console.error('Error stack:', batchError?.stack);
            
            // Mark all pending pages as failed
            const progress = await getProgress(jobId);
            if (progress) {
              for (const page of progress.pageResults) {
                if (page.status === 'pending' || page.status === 'processing') {
                  await updatePageProgress(jobId, page.url, 'failed');
                }
              }
            }
            
            // If no successful audits, we'll fall back to mock data below
            if (successful.length === 0) {
              console.log('⚠️ All audits failed, will fall back to mock data');
            }
          }
        }

        // Progressive fallback strategy when audits fail
        if (successful.length === 0) {
          console.error('❌ No pages were successfully audited');
          
          // Analyze failure reasons
          const failureReasons = {
            browser: failed.filter(f => f.errorType === 'browser').length,
            network: failed.filter(f => f.errorType === 'network').length,
            timeout: failed.filter(f => f.errorType === 'timeout').length,
            api: failed.filter(f => f.errorType === 'api').length,
            rate_limit: failed.filter(f => f.errorType === 'rate_limit').length,
            unknown: failed.filter(f => f.errorType === 'unknown').length,
          };
          
          console.log('📊 Failure analysis:', failureReasons);
          
          // Determine fallback strategy based on failure types
          const hasRetryableErrors = failureReasons.network > 0 || 
                                     failureReasons.timeout > 0 || 
                                     failureReasons.rate_limit > 0 ||
                                     failureReasons.api > 0;
          
          if (hasRetryableErrors && actualPageCount <= 5) {
            // If few pages and retryable errors, suggest retry
            console.log('⚠️ Retryable errors detected. Consider retrying with fewer pages.');
            await updateStatus(jobId, 'failed');
            
            const finalProgress = await getProgress(jobId);
            if (finalProgress) {
              (finalProgress as any).finalResult = {
                error: 'All audits failed with retryable errors',
                errorType: 'retryable_failures',
                failedPages: failed.map(f => ({ 
                  url: f.url, 
                  error: f.error, 
                  errorType: f.errorType, 
                  retryable: f.retryable 
                })),
                failureAnalysis: failureReasons,
                suggestion: 'Try again with fewer pages or check network connectivity',
                aggregated: null,
                sortedPages: [],
                pageResults: [],
                isMockData: false,
              };
            }
            return;
          }
          
          // Fallback to mock data for demonstration/testing
          console.log('⚠️ Falling back to mock data for testing...');
          console.log('   This allows you to see the UI/UX even when real audits fail.');
          
          // Use mock data as fallback
          const mockPages = generateMockPages(targetUrl.toString(), Math.min(actualPageCount, 10));
          const mockResults = [];
          
          for (let i = 0; i < mockPages.length; i++) {
            const pageUrl = mockPages[i];
            await updatePageProgress(jobId, pageUrl, 'processing');
            
            // Simulate processing with realistic timing
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
            
            const mockResult = generateMockAuditForPage(pageUrl);
            mockResults.push(mockResult);
            await updatePageProgress(jobId, pageUrl, 'completed', mockResult.summary.overallScore);
          }
          
          // Use mock results for aggregation
          const aggregated = aggregateAuditResults(mockResults, targetUrl.toString());
          const sortedPages = sortPagesBySeverity(mockResults);
          
          const finalProgress = await getProgress(jobId);
          if (finalProgress) {
            (finalProgress as any).finalResult = {
              aggregated,
              sortedPages,
              pageResults: mockResults,
              failedPages: failed.map(f => ({ 
                url: f.url, 
                error: f.error, 
                errorType: f.errorType, 
                retryable: f.retryable 
              })),
              failureAnalysis: failureReasons,
              isMockData: true, // Flag to indicate mock data was used
              fallbackReason: 'All real audits failed, using mock data for demonstration',
            };
            // Save the final result back
            await updateStatus(jobId, 'completed');
          } else {
            await updateStatus(jobId, 'completed');
          }
          console.log(`✅ Full-site audit completed with mock data: ${mockResults.length} pages`);
          return;
        }
        
        // Partial success: Some pages succeeded, some failed
        if (failed.length > 0 && successful.length > 0) {
          console.log(`⚠️ Partial success: ${successful.length} succeeded, ${failed.length} failed`);
          
          // Analyze which failures are retryable
          const retryableFailures = failed.filter(f => f.retryable);
          const nonRetryableFailures = failed.filter(f => !f.retryable);
          
          console.log(`   Retryable failures: ${retryableFailures.length}`);
          console.log(`   Non-retryable failures: ${nonRetryableFailures.length}`);
          
          // Store failure analysis in final result
          const finalProgress = getProgress(jobId);
          if (finalProgress) {
            const failureReasons = {
              browser: failed.filter(f => f.errorType === 'browser').length,
              network: failed.filter(f => f.errorType === 'network').length,
              timeout: failed.filter(f => f.errorType === 'timeout').length,
              api: failed.filter(f => f.errorType === 'api').length,
              rate_limit: failed.filter(f => f.errorType === 'rate_limit').length,
              unknown: failed.filter(f => f.errorType === 'unknown').length,
            };
            
            (finalProgress as any).finalResult = {
              ...(finalProgress as any).finalResult,
              failedPages: failed.map(f => ({ 
                url: f.url, 
                error: f.error, 
                errorType: f.errorType, 
                retryable: f.retryable 
              })),
              failureAnalysis: failureReasons,
              partialSuccess: true,
              retryableFailures: retryableFailures.length,
              nonRetryableFailures: nonRetryableFailures.length,
            };
          }
        }

        // Step 3: Aggregate results
        await updateStatus(jobId, 'aggregating');
        console.log(`📊 Aggregating results from ${successful.length} successful audits...`);
        
        const aggregated = aggregateAuditResults(successful, targetUrl.toString());
        const sortedPages = sortPagesBySeverity(successful);

        // Store final result
        const finalProgress = await getProgress(jobId);
        if (finalProgress) {
          (finalProgress as any).finalResult = {
            aggregated,
            sortedPages,
            pageResults: successful,
            failedPages: failed.map(f => ({ url: f.url, error: f.error, errorType: f.errorType, retryable: f.retryable })),
            isMockData: forceMockData || false,
          };
          // Save the final result back
          await updateStatus(jobId, 'completed');
        } else {
          await updateStatus(jobId, 'completed');
        }
        console.log(`✅ Full-site audit completed: ${successful.length} successful, ${failed.length} failed`);
      } catch (error: any) {
        console.error('❌ Full-site audit error:', error);
        console.error('Error stack:', error.stack);
        
        // Update status to failed
        const finalProgress = await getProgress(jobId);
        if (finalProgress) {
          // Store error information
          (finalProgress as any).finalResult = {
            error: error.message || 'Unknown error occurred',
            errorType: 'audit_failed',
            failedPages: finalProgress.pageResults.filter(p => p.status === 'failed').map(p => ({
              url: p.url,
              error: 'Audit process failed',
              errorType: 'unknown' as const,
              retryable: true,
            })),
            aggregated: null,
            sortedPages: [],
            pageResults: [],
            isMockData: false,
          };
          await updateStatus(jobId, 'failed');
        }
      }
    })();

    // Verify job exists before returning (with multiple attempts)
    let verifyProgress = await getProgress(jobId);
    let verifyAttempts = 0;
    const maxVerifyAttempts = 5;
    
    while (!verifyProgress && verifyAttempts < maxVerifyAttempts) {
      verifyAttempts++;
      console.log(`   Verification attempt ${verifyAttempts}/${maxVerifyAttempts}...`);
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
      verifyProgress = await getProgress(jobId);
      
      if (verifyProgress) {
        console.log(`   ✅ Job verified on attempt ${verifyAttempts}`);
        break;
      }
    }
    
    if (!verifyProgress) {
      console.error('❌ CRITICAL: Failed to create progress tracker for job:', jobId);
      debugProgressStore();
      return NextResponse.json(
        { error: 'Failed to initialize audit job' },
        { status: 500 }
      );
    }
    
    console.log('✅ Job ID ready for polling:', jobId);
    console.log('   Final verification - Job status:', verifyProgress.status);
    console.log('   Final verification - Total pages:', verifyProgress.totalPages);
    debugProgressStore();

    // Return job ID immediately with initial progress for client-side caching
    // This helps in serverless environments where in-memory storage may not persist
    return NextResponse.json({
      jobId,
      status: 'started',
      message: 'Full-site audit started. Use the jobId to check progress.',
      initialProgress: {
        status: verifyProgress.status,
        totalPages: verifyProgress.totalPages,
        completedPages: verifyProgress.completedPages,
        percentage: verifyProgress.percentage,
      },
    });
  } catch (error: any) {
    console.error('Audit error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start full-site audit' },
      { status: 500 }
    );
  }
}

