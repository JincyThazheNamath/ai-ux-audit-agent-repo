import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { auditSinglePage } from '../../../../lib/auditHelper';
import { createProgressTracker, getProgress, saveFinalResult, updatePageProgress, updateStatus } from '../../../../lib/progressTracker';

type QueuePayload = {
  jobId: string;
  url: string;
};

function parseQueuePayload(rawBody: string): QueuePayload {
  const parsed = JSON.parse(rawBody) as Partial<QueuePayload>;
  if (!parsed.jobId || !parsed.url) {
    throw new Error('Invalid queue payload');
  }
  return {
    jobId: parsed.jobId,
    url: parsed.url,
  };
}

async function verifyQstashSignature(request: NextRequest, rawBody: string): Promise<void> {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  // Allow local/manual testing without signature in non-production.
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  if (!currentSigningKey || !nextSigningKey) {
    throw new Error('QStash signing keys are not configured');
  }

  const signature = request.headers.get('upstash-signature');
  if (!signature) {
    throw new Error('Missing upstash-signature header');
  }

  const receiver = new Receiver({
    currentSigningKey,
    nextSigningKey,
  });

  await receiver.verify({
    signature,
    body: rawBody,
    url: request.url,
  });
}

export async function POST(request: NextRequest) {
  let jobId = '';
  let url = '';

  try {
    const rawBody = await request.text();
    await verifyQstashSignature(request, rawBody);

    const payload = parseQueuePayload(rawBody);
    jobId = payload.jobId;
    url = payload.url;

    let progress = await getProgress(jobId);
    if (!progress) {
      progress = await createProgressTracker(jobId, 1);
    }

    progress.pageResults = [{ url, status: 'processing' }];
    await updateStatus(jobId, 'auditing', url);
    await updatePageProgress(jobId, url, 'processing');

    const result = await auditSinglePage(url);
    const score = result.summary?.overallScore;

    await updatePageProgress(jobId, url, 'completed', score);
    await saveFinalResult(jobId, result);

    return NextResponse.json({ ok: true, jobId });
  } catch (error: any) {
    const message = error?.message || 'Queue processing failed';
    if (jobId && url) {
      try {
        await updatePageProgress(jobId, url, 'failed');
        await saveFinalResult(jobId, { error: message, errorType: 'qstash_worker_failed' });
      } catch (persistError) {
        console.error('Failed to persist queue failure status:', persistError);
      }
    }
    return NextResponse.json({ error: message, jobId }, { status: 500 });
  }
}
