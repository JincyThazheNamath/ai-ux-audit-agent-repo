import { NextRequest, NextResponse } from 'next/server';
import { getProgress, updateStatus, updatePageProgress, saveFinalResult } from '../../../../lib/progressTracker';
import { processBatches } from '../../../../lib/batchProcessor';
import { aggregateAuditResults, sortPagesBySeverity } from '../../../../lib/batchAuditor';

// Vercel serverless function configuration
// Serverless function configuration
// Netlify Pro: 26s timeout max
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
        try {
            await processBatches(currentBatchUrls, jobId, {
                batchSize: BATCH_SIZE,
                delayBetweenBatches: 0,
                delayBetweenRequests: 1000,
                maxRetries: 1,
                timeoutPerPage: 30000
            });
        } catch (err: any) {
            console.error(`[Batch] ⚠️ Batch processing error: ${err.message}`);
        }

        // 5. Recursive Call
        // Check if there are MORE pages after this batch
        const remainingPagesCount = pendingPages.length - currentBatchUrls.length;

        if (remainingPagesCount > 0) {
            console.log(`[Batch] 🔄 triggering next batch (${remainingPagesCount} pages remaining)...`);

            const origin = new URL(request.url).origin;
            const nextBatchUrl = `${origin}/api/audit/batch`;

            console.log(`[Batch] 🔗 Next batch URL: ${nextBatchUrl}`);

            try {
                fetch(nextBatchUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jobId })
                }).catch(e => console.error(`[Batch] ❌ Failed to trigger next batch: ${e.message}`));

            } catch (e) {
                console.error(`[Batch] ❌ Error initiating next batch:`, e);
            }
        } else {
            // No more pages, we are done
            console.log(`[Batch] ✅ Final batch completed.`);

            // Trigger final aggregation
            try {
                const { getAllPageResults } = await import('../../../../lib/progressTracker');
                const allResults = await getAllPageResults(jobId);

                if (allResults.length > 0) {
                    console.log(`[Batch] 📊 Aggregating ${allResults.length} page results...`);
                    const aggregated = aggregateAuditResults(allResults, allResults[0].url); // Use first URL as base?
                    const sortedPages = sortPagesBySeverity(allResults);

                    // Fetch current progress to get failed pages list
                    const finalProgress = await getProgress(jobId);
                    const failedPages = finalProgress ? finalProgress.pageResults.filter(p => p.status === 'failed') : [];

                    await saveFinalResult(jobId, {
                        aggregated,
                        sortedPages,
                        pageResults: allResults,
                        failedPages: failedPages.map(p => ({
                            url: p.url,
                            error: 'Audit failed', // We might need better error tracking in KV, but this is a start
                            errorType: 'unknown',
                            retryable: true
                        })),
                        isMockData: false
                    });
                    console.log(`[Batch] ✅ Final aggregation completed and saved.`);
                } else {
                    console.warn(`[Batch] ⚠️ No results found to aggregate.`);
                    await updateStatus(jobId, 'completed');
                }

            } catch (aggError: any) {
                console.error(`[Batch] ❌ Aggregation error:`, aggError);
                // Ensure we at least mark as completed so UI doesn't hang
                await updateStatus(jobId, 'completed');
            }
        }

        return NextResponse.json({
            status: 'processing',
            processed: currentBatchUrls.length,
            remaining: remainingPagesCount
        });

    } catch (error: any) {
        console.error(`[Batch] ❌ Critical error: ${error.message}`);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
