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
    // CRITICAL: Await so when we return 200, status is already 'auditing' and progress polling can trigger batch if fetch fails
    await updateStatus(jobId, 'auditing', `Retrying ${resetCount} failed pages...`);
    console.log(`[Retry] ✅ Status updated to 'auditing'`);

    // 5. Trigger batch processing for the retry pages (best-effort; frontend will also trigger on 'auditing')
    const origin = new URL(request.url).origin;
    const batchApiUrl = `${origin}/api/audit/batch`;
    console.log(`[Retry] 🔗 Triggering batch processing at: ${batchApiUrl}`);

    // Fire-and-forget: if this fails (e.g. Netlify self-fetch), progress polling will see 'auditing' and trigger batch
    fetch(batchApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId })
    }).then((res) => {
      if (res.ok) {
        console.log(`[Retry] ✅ Batch processing triggered successfully`);
      } else {
        console.error(`[Retry] ⚠️ Batch trigger returned ${res.status}`);
        // Retry once after 1s (runs in background)
        setTimeout(() => {
          fetch(batchApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId })
          }).then((r) => {
            console.log(`[Retry] 🔄 Retry trigger: ${r.ok ? 'ok' : r.status}`);
          }).catch((e: any) => {
            console.error(`[Retry] ❌ Retry trigger failed: ${e.message}`);
          });
        }, 1000);
      }
    }).catch((e: any) => {
      console.error(`[Retry] ❌ Failed to trigger batch processing: ${e.message}`);
      // Retry once after 1s (runs in background)
      setTimeout(() => {
        fetch(batchApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId })
        }).then((r) => {
          console.log(`[Retry] 🔄 Retry trigger: ${r.ok ? 'ok' : r.status}`);
        }).catch((err: any) => {
          console.error(`[Retry] ❌ Retry trigger failed: ${err.message}`);
        });
      }, 1000);
    });

    return NextResponse.json({
      success: true,
      jobId,
      resetCount,
      message: `Retry initiated for ${resetCount} failed pages. Processing will continue in the background.`
    });

  } catch (error: any) {
    console.error(`[Retry] ❌ Error: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
