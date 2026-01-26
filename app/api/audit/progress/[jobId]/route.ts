import { NextRequest, NextResponse } from 'next/server';
import { getProgress, formatTimeLeft, getAllJobs, debugProgressStore } from '../../../../../lib/progressTracker';

// Next.js 14 route handler signature
// In Next.js 14, the signature is: GET(request, { params })
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // Extract jobId from params (Next.js 14 uses sync params)
    let jobId: string | null = null;
    
    // Try to get from params first
    try {
      if (params && typeof params === 'object' && 'jobId' in params) {
        jobId = params.jobId;
        console.log('   ✅ Extracted jobId from params:', jobId);
      }
    } catch (err) {
      console.warn('   Failed to extract from params:', err);
    }
    
    // Always fallback to URL extraction (most reliable)
    if (!jobId && request.nextUrl) {
      const pathname = request.nextUrl.pathname;
      console.log('   Extracting jobId from URL pathname:', pathname);
      
      // Pattern: /api/audit/progress/{jobId}
      // Split by '/' and get the segment after 'progress'
      const parts = pathname.split('/').filter(p => p);
      const progressIndex = parts.indexOf('progress');
      
      if (progressIndex >= 0 && progressIndex < parts.length - 1) {
        jobId = parts[progressIndex + 1];
        // Remove query params if any
        jobId = jobId.split('?')[0];
        // Remove any "progress:" prefix if accidentally included
        if (jobId.startsWith('progress:')) {
          jobId = jobId.replace(/^progress:/, '');
          console.log('   ⚠️ Removed "progress:" prefix from jobId');
        }
        console.log('   ✅ Extracted jobId from URL:', jobId);
      } else {
        // Regex fallback - match UUID pattern
        const uuidMatch = pathname.match(/progress\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        if (uuidMatch && uuidMatch[1]) {
          jobId = uuidMatch[1];
          console.log('   ✅ Extracted jobId via regex:', jobId);
        }
      }
    }

    if (!jobId) {
      console.error('❌ Job ID extraction failed completely');
      console.error('   Request URL:', request.url);
      console.error('   Pathname:', request.nextUrl?.pathname);
      console.error('   Params:', params);
      return NextResponse.json({ 
        error: 'Job ID is required',
        debug: {
          url: request.url,
          pathname: request.nextUrl?.pathname,
          hasParams: !!params,
          paramsType: typeof params,
          paramsValue: params,
        }
      }, { status: 400 });
    }

    // Clean up jobId: remove any "progress:" prefix and trim whitespace
    jobId = jobId.trim();
    if (jobId.startsWith('progress:')) {
      jobId = jobId.replace(/^progress:/, '');
      console.log('   ⚠️ Removed "progress:" prefix from jobId');
    }

    console.log('🔍 Progress check for jobId:', jobId);
    console.log('   Request URL:', request.url);
    console.log('   Pathname:', request.nextUrl?.pathname);
    console.log('   Extracted jobId:', jobId);
    console.log('   jobId type:', typeof jobId);
    console.log('   jobId length:', jobId?.length);
    console.log('   jobId trimmed:', jobId.trim());
    console.log('   jobId JSON:', JSON.stringify(jobId));
    
    // Debug: Show all jobs in store BEFORE lookup
    console.log('📊 Store state BEFORE lookup:');
    await debugProgressStore();
    
    // Try to get progress with trimmed jobId as well
    let progress = await getProgress(jobId);
    if (!progress) {
      // Try with trimmed version
      const trimmedJobId = jobId.trim();
      if (trimmedJobId !== jobId) {
        console.log(`   Trying with trimmed jobId: "${trimmedJobId}"`);
        progress = await getProgress(trimmedJobId);
      }
    }

    if (!progress) {
      const availableJobs = await getAllJobs();
      console.log('❌ Job not found in progress tracker');
      console.log('   Requested jobId:', jobId);
      console.log('   Requested jobId type:', typeof jobId);
      console.log('   Requested jobId length:', jobId?.length);
      console.log('   Available jobIds:', availableJobs);
      console.log('   Available jobIds types:', availableJobs.map(j => typeof j));
      console.log('   Total jobs in store:', availableJobs.length);
      
      // Check for exact matches and partial matches
      const exactMatch = availableJobs.find(j => j === jobId);
      const partialMatch = availableJobs.find(j => j.includes(jobId) || jobId.includes(j));
      
      console.log('   Exact match:', exactMatch || 'none');
      console.log('   Partial match:', partialMatch || 'none');
      console.log('   JobId match check:', availableJobs.map(j => ({
        stored: j,
        requested: jobId,
        exact: j === jobId,
        storedLength: j.length,
        requestedLength: jobId.length,
      })));
      
      // If no jobs exist, check if we're in production without Redis
      const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
      const hasRedisUrl = !!process.env.REDIS_URL;
      
      console.log('   Redis Status check:');
      console.log('     - Redis Labs (REDIS_URL):', !!hasRedisUrl);
      
      if (availableJobs.length === 0) {
        if (isProduction && !hasRedisUrl) {
          return NextResponse.json({ 
            error: 'Job not found',
            jobId,
            message: 'REDIS_URL is not configured in production. Progress tracking requires Redis to persist across serverless invocations. Please configure REDIS_URL in Vercel (Settings → Environment Variables) or the job may have been created in a different serverless instance.',
            debug: {
              reason: 'No jobs found in progress tracker - REDIS_URL not configured',
              storeSize: availableJobs.length,
              extractedJobId: jobId,
              isProduction,
              hasRedisUrl: false,
            },
            fix: 'Configure REDIS_URL environment variable in your Vercel project settings (Settings → Environment Variables)'
          }, { status: 404 });
        }
        
        return NextResponse.json({ 
          error: 'Job not found',
          jobId,
          message: 'The audit job may not have started yet. Please wait a moment and try again.',
          debug: {
            reason: 'No jobs found in progress tracker',
            storeSize: availableJobs.length,
            extractedJobId: jobId,
          }
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        error: 'Job not found',
        jobId,
        availableJobs: availableJobs.length > 0 ? availableJobs.slice(0, 5) : undefined, // Limit to 5 for response size
        message: 'The audit job may not have started yet or has expired.',
        debug: {
          requestedJobId: jobId,
          requestedJobIdLength: jobId?.length,
          availableJobCount: availableJobs.length,
          exactMatch: exactMatch || null,
          partialMatch: partialMatch || null,
        }
      }, { status: 404 });
    }
    
    console.log('✅ Job found. Status:', progress.status, 'Completed:', progress.completedPages, '/', progress.totalPages);

    // Get final result if completed
    const finalResult = (progress as any).finalResult;

    return NextResponse.json({
      ...progress,
      estimatedTimeLeftFormatted: formatTimeLeft(progress.estimatedTimeLeft),
      finalResult: finalResult || null,
    });
  } catch (error: any) {
    console.error('Progress check error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to check progress' },
      { status: 500 }
    );
  }
}

