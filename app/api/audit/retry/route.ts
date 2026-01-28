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
    let resetCount = 0;
    for (const url of retryUrls) {
      const pageIndex = progress.pageResults.findIndex(p => p.url === url);
      if (pageIndex >= 0) {
        const pageResult = progress.pageResults[pageIndex];
        if (pageResult.status === 'failed') {
          // Reset to pending for retry
          await updatePageProgress(jobId, url, 'pending');
          resetCount++;
          console.log(`[Retry] ✅ Reset ${url} from failed to pending`);
        } else if (pageResult.status === 'completed') {
          console.log(`[Retry] ⚠️ Skipping ${url} - already completed`);
        } else {
          console.log(`[Retry] ⚠️ Skipping ${url} - status is ${pageResult.status}`);
        }
      } else {
        console.warn(`[Retry] ⚠️ URL not found in job: ${url}`);
      }
    }

    if (resetCount === 0) {
      return NextResponse.json({ 
        error: 'No failed pages to retry. All specified URLs are already completed or not found.',
        resetCount: 0
      }, { status: 400 });
    }

    // 4. Update job status to 'auditing' to resume processing
    await updateStatus(jobId, 'auditing', `Retrying ${resetCount} failed pages...`);

    // 5. Trigger batch processing for the retry pages
    const origin = new URL(request.url).origin;
    const batchApiUrl = `${origin}/api/audit/batch`;
    
    console.log(`[Retry] 🔗 Triggering batch processing at: ${batchApiUrl}`);

    try {
      // Trigger batch processing asynchronously
      fetch(batchApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      }).catch(e => {
        console.error(`[Retry] ❌ Failed to trigger batch processing: ${e.message}`);
      });

      console.log(`[Retry] ✅ Batch processing triggered for ${resetCount} pages`);
    } catch (triggerError: any) {
      console.error(`[Retry] ❌ Error triggering batch: ${triggerError.message}`);
      return NextResponse.json({ 
        error: `Failed to trigger batch processing: ${triggerError.message}` 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      jobId,
      resetCount,
      message: `Retry initiated for ${resetCount} failed pages`
    });

  } catch (error: any) {
    console.error(`[Retry] ❌ Error: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
