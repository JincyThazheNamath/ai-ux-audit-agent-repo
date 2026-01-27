/**
 * Neon Database Adapter
 * Provides Redis-like interface using Neon PostgreSQL database
 */

import { neon } from '@netlify/neon';

// Initialize Neon client (automatically uses NETLIFY_DATABASE_URL)
let sql: ReturnType<typeof neon> | null = null;
let dbInitialized = false;

// Initialize database connection and create tables if needed
async function initializeDb() {
  if (dbInitialized && sql) {
    return sql;
  }

  try {
    // Initialize Neon client
    sql = neon(); // Automatically uses NETLIFY_DATABASE_URL env var
    
    // Create tables if they don't exist
    await sql`
      CREATE TABLE IF NOT EXISTS audit_progress (
        job_id VARCHAR(255) PRIMARY KEY,
        progress_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS audit_page_results (
        id SERIAL PRIMARY KEY,
        job_id VARCHAR(255) NOT NULL,
        page_url TEXT NOT NULL,
        result_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        UNIQUE(job_id, page_url)
      )
    `;

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_audit_progress_job_id ON audit_progress(job_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_audit_progress_expires_at ON audit_progress(expires_at)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_page_results_job_id ON audit_page_results(job_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_page_results_expires_at ON audit_page_results(expires_at)
    `;

    dbInitialized = true;
    console.log('✅ Neon database initialized and tables created');
    return sql;
  } catch (error: any) {
    console.error('❌ Failed to initialize Neon database:', error.message);
    throw error;
  }
}

/**
 * Get a value from database (Redis-like interface)
 */
export async function dbGet(key: string): Promise<string | null> {
  try {
    const db = await initializeDb();
    
    // Clean up expired records asynchronously (don't block the get operation)
    db`DELETE FROM audit_progress WHERE expires_at IS NOT NULL AND expires_at < NOW()`.catch(() => {
      // Ignore cleanup errors
    });
    
    const result = await db`
      SELECT progress_data::text as data 
      FROM audit_progress 
      WHERE job_id = ${key} AND (expires_at IS NULL OR expires_at > NOW())
    `;
    
    return result[0]?.data || null;
  } catch (error: any) {
    console.error(`❌ Failed to get from Neon: ${error.message}`);
    return null;
  }
}

/**
 * Set a value in database (Redis-like interface)
 */
export async function dbSet(key: string, value: string, options?: { ex?: number }): Promise<void> {
  try {
    const db = await initializeDb();
    
    const expiresAt = options?.ex 
      ? new Date(Date.now() + options.ex * 1000)
      : null;
    
    await db`
      INSERT INTO audit_progress (job_id, progress_data, expires_at, updated_at)
      VALUES (${key}, ${value}::jsonb, ${expiresAt}, NOW())
      ON CONFLICT (job_id) 
      DO UPDATE SET 
        progress_data = ${value}::jsonb,
        expires_at = ${expiresAt},
        updated_at = NOW()
    `;
  } catch (error: any) {
    console.error(`❌ Failed to set in Neon: ${error.message}`);
    throw error;
  }
}

/**
 * Delete a key from database (Redis-like interface)
 */
export async function dbDel(key: string): Promise<void> {
  try {
    const db = await initializeDb();
    await db`DELETE FROM audit_progress WHERE job_id = ${key}`;
  } catch (error: any) {
    console.error(`❌ Failed to delete from Neon: ${error.message}`);
  }
}

/**
 * Get all keys matching a pattern (Redis-like interface)
 */
export async function dbKeys(pattern: string): Promise<string[]> {
  try {
    const db = await initializeDb();
    
    // Convert Redis pattern to SQL LIKE pattern
    // audit:progress:* -> audit:progress:%
    // Keep colons as-is since we store keys with colons
    const sqlPattern = pattern.replace(/\*/g, '%');
    
    const result = await db`
      SELECT job_id 
      FROM audit_progress 
      WHERE job_id LIKE ${sqlPattern} AND (expires_at IS NULL OR expires_at > NOW())
    `;
    
    return result.map((row: any) => row.job_id);
  } catch (error: any) {
    console.error(`❌ Failed to get keys from Neon: ${error.message}`);
    return [];
  }
}

/**
 * Save a page result to database
 */
export async function dbSavePageResult(jobId: string, url: string, result: any): Promise<void> {
  try {
    const db = await initializeDb();
    
    const resultJson = JSON.stringify(result);
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour expiration
    
    await db`
      INSERT INTO audit_page_results (job_id, page_url, result_data, expires_at)
      VALUES (${jobId}, ${url}, ${resultJson}::jsonb, ${expiresAt})
      ON CONFLICT (job_id, page_url)
      DO UPDATE SET 
        result_data = ${resultJson}::jsonb,
        expires_at = ${expiresAt}
    `;
  } catch (error: any) {
    console.error(`❌ Failed to save page result to Neon: ${error.message}`);
    throw error;
  }
}

/**
 * Get a page result from database
 */
export async function dbGetPageResult(jobId: string, url: string): Promise<any | null> {
  try {
    const db = await initializeDb();
    
    const result = await db`
      SELECT result_data 
      FROM audit_page_results 
      WHERE job_id = ${jobId} AND page_url = ${url} 
        AND (expires_at IS NULL OR expires_at > NOW())
    `;
    
    return result[0]?.result_data || null;
  } catch (error: any) {
    console.error(`❌ Failed to get page result from Neon: ${error.message}`);
    return null;
  }
}

/**
 * Get all page results for a job
 */
export async function dbGetAllPageResults(jobId: string): Promise<any[]> {
  try {
    const db = await initializeDb();
    
    const results = await db`
      SELECT result_data 
      FROM audit_page_results 
      WHERE job_id = ${jobId} AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at ASC
    `;
    
    return results.map((row: any) => row.result_data);
  } catch (error: any) {
    console.error(`❌ Failed to get all page results from Neon: ${error.message}`);
    return [];
  }
}

/**
 * Clean up old expired records
 */
export async function dbCleanup(): Promise<number> {
  try {
    const db = await initializeDb();
    
    // Delete expired progress records and get count
    const progressResult = await db`
      WITH deleted AS (
        DELETE FROM audit_progress 
        WHERE expires_at IS NOT NULL AND expires_at < NOW()
        RETURNING job_id
      )
      SELECT COUNT(*) as count FROM deleted
    `;
    
    // Delete expired page results and get count
    const resultsResult = await db`
      WITH deleted AS (
        DELETE FROM audit_page_results 
        WHERE expires_at IS NOT NULL AND expires_at < NOW()
        RETURNING id
      )
      SELECT COUNT(*) as count FROM deleted
    `;
    
    // Extract counts from result arrays
    const progressCount = parseInt(progressResult[0]?.count || '0', 10);
    const resultsCount = parseInt(resultsResult[0]?.count || '0', 10);
    const totalDeleted = progressCount + resultsCount;
    
    return totalDeleted;
  } catch (error: any) {
    console.error(`❌ Failed to cleanup Neon: ${error.message}`);
    return 0;
  }
}
