import { NextRequest, NextResponse } from 'next/server';
import { getAllJobs, debugProgressStore, createProgressTracker, getProgress } from '../../../../../lib/progressTracker';

/**
 * Test endpoint to verify progress tracker is working
 * GET /api/audit/progress/test
 */
export async function GET(request: NextRequest) {
  try {
    debugProgressStore();
    const allJobs = getAllJobs();
    
    return NextResponse.json({
      success: true,
      totalJobs: allJobs.length,
      jobIds: allJobs,
      message: 'Progress tracker is working',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Test failed' },
      { status: 500 }
    );
  }
}

/**
 * Create a test job to verify the progress tracker
 * POST /api/audit/progress/test
 */
export async function POST(request: NextRequest) {
  try {
    const testJobId = 'test-' + Date.now();
    const progress = createProgressTracker(testJobId, 5);
    
    const retrieved = getProgress(testJobId);
    
    return NextResponse.json({
      success: true,
      created: !!progress,
      retrieved: !!retrieved,
      jobId: testJobId,
      message: retrieved ? 'Progress tracker is working correctly' : 'Progress tracker has issues',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Test failed' },
      { status: 500 }
    );
  }
}




