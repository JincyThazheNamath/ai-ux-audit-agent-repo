import { NextRequest, NextResponse } from 'next/server';
import { getProgress, updateStatus, updatePageProgress } from '../../../../lib/progressTracker';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { jobId, retryUrls } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    if (!retryUrls || !Array.isArray(retryUrls) || retryUrls.length === 0) {
      return NextResponse.json({ error: 'Retry URLs are required' }, { status: 400 });
    }

    console.log(`[Retry] 🔄 Retrying ${retryUrls.length} failed pages for job: ${jobId}`);
    console.log(`[Retry] URLs: ${retryUrls.join(', ')}`);

    // 1. Get existing progress
    const progress = await getProgress(jobId);
    if (!progress) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 2. Verify retry URLs are actually failed pages in this job
    const retryUrlsSet = new Set(retryUrls);
    const existingFailedUrls = progress.pageResults
      .filter(p => p.status === 'failed')
      .map(p => p.url);
    
    const invalidUrls = retryUrls.filter(url => !existingFailedUrls.includes(url));
    if (invalidUrls.length > 0) {
      console.warn(`[Retry] ⚠️ Some URLs are not failed pages: ${invalidUrls.join(', ')}`);
    }

    // 3. Reset failed pages to 'pending' status (preserve completed pages)
    // OPTIMIZATION: Batch update all pages at once to reduce DB calls and stay under Netlify timeout
    let resetCount = 0;
    const pagesToReset: string[] = [];
    
    for (const url of retryUrls) {
      const pageIndex = progress.pageResults.findIndex(p => p.url === url);
      if (pageIndex >= 0) {
        const pageResult = progress.pageResults[pageIndex];
        if (pageResult.status === 'failed') {
          pagesToReset.push(url);
          resetCount++;
        } else if (pageResult.status === 'completed') {
          console.log(`[Retry] ⚠️ Skipping ${url} - already completed`);
        } else {
          console.log(`[Retry] ⚠️ Skipping ${url} - status is ${pageResult.status}`);
        }
      } else {
        console.warn(`[Retry] ⚠️ URL not found in job: ${url}`);
      }
    }
    
    // Batch update all pages (more efficient than individual updates)
    // CRITICAL: Do this in parallel to reduce time spent in retry API
    if (pagesToReset.length > 0) {
      console.log(`[Retry] 🔄 Resetting ${pagesToReset.length} pages to pending...`);
      await Promise.all(
        pagesToReset.map(url => updatePageProgress(jobId, url, 'pending'))
      );
      console.log(`[Retry] ✅ Reset ${pagesToReset.length} pages to pending`);
    }

    if (resetCount === 0) {
      return NextResponse.json({ 
        error: 'No failed pages to retry. All specified URLs are already completed or not found.',
        resetCount: 0
      }, { status: 400 });
    }

    // 4. Update job status to 'auditing' to resume processing
    // CRITICAL: Await status update to ensure it's saved before returning
    await updateStatus(jobId, 'auditing', `Retrying ${resetCount} failed pages...`);
    console.log(`[Retry] ✅ Status updated to 'auditing'`);

    // 5. Trigger batch processing for the retry pages
    // CRITICAL FIX: In Netlify serverless, fetch() to same origin may fail
    // We have two mechanisms:
    // 1. Try to trigger batch via fetch (works in most cases)
    // 2. Progress polling component will detect 'auditing' status and trigger batch automatically
    
    const origin = new URL(request.url).origin;
    const batchApiUrl = `${origin}/api/audit/batch`;
    
    console.log(`[Retry] 🔗 Attempting to trigger batch processing at: ${batchApiUrl}`);

    // Try to trigger batch processing with timeout
    // If this fails, progress polling will pick it up automatically
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout - quick attempt
      
      const response = await fetch(batchApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`[Retry] ✅ Batch processing triggered successfully via fetch`);
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.warn(`[Retry] ⚠️ Batch trigger returned ${response.status}: ${errorText}`);
        console.log(`[Retry] ℹ️ Progress polling will trigger batch processing automatically (fallback)`);
      }
    } catch (fetchError: any) {
      // Fetch failed - this is OK, progress polling will handle it
      if (fetchError.name === 'AbortError') {
        console.log(`[Retry] ⏱️ Batch trigger timeout (expected) - progress polling will handle it`);
      } else {
        console.warn(`[Retry] ⚠️ Could not trigger batch via fetch: ${fetchError.message}`);
      }
      console.log(`[Retry] ℹ️ Progress polling component will detect 'auditing' status and trigger batch automatically`);
      console.log(`[Retry] ℹ️ This fallback ensures retry works even if fetch() fails in serverless`);
    }

    // Return success - batch processing will be triggered either by fetch() or progress polling
    // The SiteAuditProgress component checks for status change to 'auditing' and triggers batch immediately
    return NextResponse.json({
      success: true,
      jobId,
      resetCount,
      message: `Retry initiated for ${resetCount} failed pages. Processing will continue automatically.`
    });

  } catch (error: any) {
    console.error(`[Retry] ❌ Error: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
