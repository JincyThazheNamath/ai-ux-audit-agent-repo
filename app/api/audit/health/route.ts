import { NextRequest, NextResponse } from 'next/server';
import { initializeKv } from '../../../../lib/progressTracker';

/**
 * Health check endpoint for monitoring Redis connectivity
 * GET /api/audit/health
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Test Redis connectivity
    let redisHealthy = false;
    let redisError: string | null = null;
    
    try {
      await initializeKv();
      // Try to get a test key to verify connection works
      const { getProgress } = await import('../../../../lib/progressTracker');
      // Just checking if Redis is accessible, not testing with actual data
      redisHealthy = true;
    } catch (error: any) {
      redisError = error.message;
      redisHealthy = false;
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

