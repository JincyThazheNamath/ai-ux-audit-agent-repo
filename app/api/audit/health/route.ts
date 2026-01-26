import { NextRequest, NextResponse } from 'next/server';
import { getProgress } from '../../../../lib/progressTracker';

/**
 * Health check endpoint for monitoring Redis connectivity
 * GET /api/audit/health
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Test Redis connectivity by trying to access progress tracker
    // This will trigger Redis initialization if needed
    let redisHealthy = false;
    let redisError: string | null = null;
    
    try {
      // Try to get progress for a non-existent job - this will test Redis connection
      // without requiring actual data
      await getProgress('health-check-test-' + Date.now());
      // If we get here without error, Redis is accessible
      redisHealthy = true;
    } catch (error: any) {
      // Check if it's a connection error or just "job not found"
      if (error.message?.includes('Redis connection') || error.message?.includes('REDIS_URL')) {
        redisError = error.message;
        redisHealthy = false;
      } else {
        // "Job not found" is expected - means Redis is working
        redisHealthy = true;
      }
    }
    
    const responseTime = Date.now() - startTime;
    
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    const hasRedisUrl = !!process.env.REDIS_URL;
    
    const healthStatus = {
      status: redisHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      environment: {
        isProduction,
        hasRedisUrl,
        nodeEnv: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL,
      },
      redis: {
        configured: hasRedisUrl,
        required: isProduction,
        healthy: redisHealthy,
        error: redisError,
      },
      message: isProduction && !hasRedisUrl 
        ? 'WARNING: Redis not configured - progress tracking will not work in production'
        : redisHealthy 
          ? 'All systems operational'
          : `Redis connection failed: ${redisError}`
    };
    
    return NextResponse.json(healthStatus, { 
      status: redisHealthy ? 200 : 503 
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}

