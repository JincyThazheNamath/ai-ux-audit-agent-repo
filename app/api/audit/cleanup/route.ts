import { NextRequest, NextResponse } from 'next/server';
import { cleanupOldRedisData, getAllJobs } from '../../../../lib/progressTracker';

export async function POST(request: NextRequest) {
  try {
    // Get all jobs first
    const allJobs = await getAllJobs();
    console.log(`[Cleanup] Found ${allJobs.length} jobs in Redis`);

    // Clean up old completed jobs
    await cleanupOldRedisData();

    // Get remaining jobs after cleanup
    const remainingJobs = await getAllJobs();
    console.log(`[Cleanup] Remaining jobs: ${remainingJobs.length}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Cleanup completed',
      cleaned: allJobs.length - remainingJobs.length,
      remaining: remainingJobs.length,
      before: allJobs.length,
      after: remainingJobs.length
    });
  } catch (error: any) {
    console.error('[Cleanup] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Cleanup failed',
      success: false
    }, { status: 500 });
  }
}

// Also add GET for status check
export async function GET(request: NextRequest) {
  try {
    const allJobs = await getAllJobs();
    return NextResponse.json({ 
      totalJobs: allJobs.length,
      jobs: allJobs.slice(0, 10), // Show first 10
      message: 'Use POST to trigger cleanup'
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Failed to get jobs',
      success: false
    }, { status: 500 });
  }
}
