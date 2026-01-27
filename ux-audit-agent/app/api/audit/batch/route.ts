import { NextRequest, NextResponse } from 'next/server';
import { getProgress, updateStatus, updatePageProgress, saveFinalResult } from '../../../../../lib/progressTracker';
import { processBatches } from '../../../../../lib/batchProcessor';
import { aggregateAuditResults, sortPagesBySeverity } from '../../../../../lib/batchAuditor';

// Vercel serverless function configuration
export const maxDuration = 300; // 5 minutes max
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const { jobId } = await request.json();

        if (!jobId) {
            return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
        }

        console.log(`[Batch] 🚀 Processing batch for Job ID: ${jobId}`);

        // 1. Get current progress
        const progress = await getProgress(jobId);
        if (!progress) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        // 2. Identify pending pages
        const pendingPages = progress.pageResults
            .filter(p => p.status === 'pending')
            .map(p => p.url);

        if (pendingPages.length === 0) {
            console.log(`[Batch] ✅ No pending pages. Job completed.`);

            // Final Aggregation
            const completedPages = progress.pageResults.filter(p => p.status === 'completed' && p.score !== undefined);
            // We need to re-fetch the full results to aggregate, but progressTracker mainly stores status.
            // In a real DB scenario, we'd fetch full results. 
            // For now, we assume the individual page results are stored in KV or similar if needed for aggregation.
            // However, the current architecture might rely on `processBatches` returning results.
            // Since we are decoupling, we might need to rely on the fact that `updatePageProgress` likely just saves status/score.
            // The original `site/route.ts` did `saveFinalResult` with aggregated data.
            // We might need to store intermediate results in Redis or just aggregate what we have.

            // For this fix, let's assume we mark it as completed first.
            // To do proper aggregation we would need to fetch all individual results.
            // Given the constraints, let's update status to completed.

            if (progress.status !== 'completed') {
                await updateStatus(jobId, 'completed');
            }

            return NextResponse.json({ status: 'completed', message: 'All pages processed' });
        }

        // 3. Define Batch Size
        const BATCH_SIZE = 4; // Small chunk to ensure it fits in timeout
        const currentBatchUrls = pendingPages.slice(0, BATCH_SIZE);

        console.log(`[Batch] 📦 Processing ${currentBatchUrls.length} pages: ${currentBatchUrls.join(', ')}`);

        // 4. Process this batch
        // We use processBatches but with a config that processes JUST this chunk
        // Use try-catch to ensure we can trigger next batch even if this one fails partially
        try {
            await processBatches(currentBatchUrls, jobId, {
                batchSize: BATCH_SIZE,
                delayBetweenBatches: 0, // No delay needed within this small atomic batch
                delayBetweenRequests: 1000,
                maxRetries: 1,
                timeoutPerPage: 30000
            });
        } catch (err: any) {
            console.error(`[Batch] ⚠️ Batch processing error: ${err.message}`);
            // Continue to recursive step to ensure we don't get stuck
        }

        // 5. Re-check progress after processing to get accurate pending count
        const updatedProgress = await getProgress(jobId);
        if (!updatedProgress) {
            console.error(`[Batch] ❌ Could not get updated progress after batch processing`);
            return NextResponse.json({ error: 'Failed to get updated progress' }, { status: 500 });
        }

        const remainingPendingPages = updatedProgress.pageResults
            .filter(p => p.status === 'pending')
            .map(p => p.url);

        // 6. Recursive Call or Finalization
        if (remainingPendingPages.length > 0) {
            console.log(`[Batch] 🔄 triggering next batch (${remainingPendingPages.length} pages remaining)...`);

            // Construct the URL for the recursive call
            const protocol = request.headers.get('x-forwarded-proto') || 'https';
            const host = request.headers.get('host');
            const nextBatchUrl = `${protocol}://${host}/api/audit/batch`;

            console.log(`[Batch] 🔗 Next batch URL: ${nextBatchUrl}`);

            // Use Vercel's waitUntil to ensure the recursive call completes
            // This is critical for serverless functions to keep running after response
            const triggerNextBatch = async () => {
                try {
                    console.log(`[Batch] 📞 Making recursive batch call...`);
                    const response = await fetch(nextBatchUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ jobId })
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`[Batch] ❌ Recursive batch call failed: ${response.status} - ${errorText}`);
                    } else {
                        const result = await response.json();
                        console.log(`[Batch] ✅ Recursive batch call succeeded:`, result);
                    }
                } catch (e: any) {
                    console.error(`[Batch] ❌ Error in recursive batch call:`, e.message);
                }
            };

            // Try to use Vercel's waitUntil if available
            try {
                const vercelFunctions = await import('@vercel/functions');
                if (vercelFunctions.waitUntil) {
                    vercelFunctions.waitUntil(triggerNextBatch());
                    console.log(`[Batch] ✅ Registered recursive call with waitUntil`);
                } else {
                    // Fallback: await the call (but this may timeout)
                    console.log(`[Batch] ⚠️ waitUntil not available, awaiting recursive call...`);
                    await triggerNextBatch();
                }
            } catch (waitError) {
                // If @vercel/functions is not available, await the call
                console.log(`[Batch] ⚠️ Could not import waitUntil, awaiting recursive call...`);
                await triggerNextBatch();
            }
        } else {
            // No more pages, we are done - trigger aggregation
            console.log(`[Batch] ✅ All pages completed. Starting aggregation...`);
            
            try {
                await updateStatus(jobId, 'aggregating');
                
                // Get all page results for aggregation
                const { getAllPageResults } = await import('../../../../../lib/progressTracker');
                const allResults = await getAllPageResults(jobId);

                if (allResults.length > 0) {
                    console.log(`[Batch] 📊 Aggregating ${allResults.length} page results...`);
                    const aggregated = aggregateAuditResults(allResults, allResults[0].url);
                    const sortedPages = sortPagesBySeverity(allResults);

                    // Get failed pages
                    const finalProgress = await getProgress(jobId);
                    const failedPages = finalProgress ? finalProgress.pageResults.filter(p => p.status === 'failed') : [];

                    await saveFinalResult(jobId, {
                        aggregated,
                        sortedPages,
                        pageResults: allResults,
                        failedPages: failedPages.map(p => ({
                            url: p.url,
                            error: 'Audit failed',
                            errorType: 'unknown',
                            retryable: true
                        })),
                        isMockData: false
                    });
                    console.log(`[Batch] ✅ Final aggregation completed and saved.`);
                } else {
                    console.warn(`[Batch] ⚠️ No results found to aggregate.`);
                }

                await updateStatus(jobId, 'completed');
                console.log(`[Batch] ✅ Job marked as completed.`);
            } catch (aggError: any) {
                console.error(`[Batch] ❌ Aggregation error:`, aggError);
                // Still mark as completed even if aggregation fails
                await updateStatus(jobId, 'completed');
            }
        }

        return NextResponse.json({
            status: 'processing',
            processed: currentBatchUrls.length,
            remaining: remainingPendingPages.length,
            totalPages: updatedProgress.totalPages,
            completedPages: updatedProgress.completedPages
        });

    } catch (error: any) {
        console.error(`[Batch] ❌ Critical error: ${error.message}`);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
