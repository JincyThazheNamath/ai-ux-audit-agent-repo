/**
 * Rate Limiter
 * Manages API call rate limiting to prevent hitting Anthropic API limits
 */

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  retryAfterOn429: number; // seconds to wait on 429 response
}

interface RequestRecord {
  timestamp: number;
}

class RateLimiter {
  private config: RateLimitConfig;
  private requests: RequestRecord[] = [];
  private last429Time: number = 0;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      maxRequestsPerMinute: config?.maxRequestsPerMinute ?? 50, // Conservative default
      maxRequestsPerHour: config?.maxRequestsPerHour ?? 1000,
      retryAfterOn429: config?.retryAfterOn429 ?? 60, // Wait 60s on 429
    };
  }

  /**
   * Cleans up old request records (older than 1 hour)
   */
  private cleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.requests = this.requests.filter(r => r.timestamp > oneHourAgo);
  }

  /**
   * Gets the number of requests in the last minute
   */
  private getRequestsInLastMinute(): number {
    const oneMinuteAgo = Date.now() - 60 * 1000;
    return this.requests.filter(r => r.timestamp > oneMinuteAgo).length;
  }

  /**
   * Gets the number of requests in the last hour
   */
  private getRequestsInLastHour(): number {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return this.requests.filter(r => r.timestamp > oneHourAgo).length;
  }

  /**
   * Calculates how long to wait before next request
   */
  private calculateWaitTime(): number {
    this.cleanup();

    // Check if we're still in 429 cooldown period
    const timeSince429 = Date.now() - this.last429Time;
    if (timeSince429 < this.config.retryAfterOn429 * 1000) {
      const remaining = this.config.retryAfterOn429 * 1000 - timeSince429;
      return Math.ceil(remaining);
    }

    const requestsLastMinute = this.getRequestsInLastMinute();
    const requestsLastHour = this.getRequestsInLastHour();

    // If we've exceeded hourly limit, wait until oldest request expires
    if (requestsLastHour >= this.config.maxRequestsPerHour) {
      const oldestRequest = Math.min(...this.requests.map(r => r.timestamp));
      const waitUntil = oldestRequest + 60 * 60 * 1000;
      return Math.max(0, waitUntil - Date.now());
    }

    // If we've exceeded per-minute limit, wait until oldest request in this minute expires
    if (requestsLastMinute >= this.config.maxRequestsPerMinute) {
      const oneMinuteAgo = Date.now() - 60 * 1000;
      const recentRequests = this.requests.filter(r => r.timestamp > oneMinuteAgo);
      if (recentRequests.length > 0) {
        const oldestRecent = Math.min(...recentRequests.map(r => r.timestamp));
        const waitUntil = oldestRecent + 60 * 1000;
        return Math.max(0, waitUntil - Date.now());
      }
    }

    return 0;
  }

  /**
   * Records a request and waits if necessary to respect rate limits
   */
  async waitIfNeeded(): Promise<void> {
    const waitTime = this.calculateWaitTime();
    if (waitTime > 0) {
      const waitSeconds = Math.ceil(waitTime / 1000);
      console.log(`⏳ Rate limit: Waiting ${waitSeconds}s before next API call...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.requests.push({ timestamp: Date.now() });
  }

  /**
   * Records a successful request
   */
  recordRequest(): void {
    this.requests.push({ timestamp: Date.now() });
    this.cleanup();
  }

  /**
   * Handles a 429 (Too Many Requests) response
   */
  handle429(retryAfter?: number): void {
    this.last429Time = Date.now();
    const waitTime = (retryAfter || this.config.retryAfterOn429) * 1000;
    console.warn(`⚠️ Rate limit hit (429). Will wait ${retryAfter || this.config.retryAfterOn429}s before retrying.`);
  }

  /**
   * Gets current rate limit status
   */
  getStatus(): {
    requestsLastMinute: number;
    requestsLastHour: number;
    maxPerMinute: number;
    maxPerHour: number;
    canMakeRequest: boolean;
    waitTimeMs: number;
  } {
    this.cleanup();
    const waitTime = this.calculateWaitTime();
    return {
      requestsLastMinute: this.getRequestsInLastMinute(),
      requestsLastHour: this.getRequestsInLastHour(),
      maxPerMinute: this.config.maxRequestsPerMinute,
      maxPerHour: this.config.maxRequestsPerHour,
      canMakeRequest: waitTime === 0,
      waitTimeMs: waitTime,
    };
  }

  /**
   * Resets the rate limiter (useful for testing)
   */
  reset(): void {
    this.requests = [];
    this.last429Time = 0;
  }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

/**
 * Gets or creates the rate limiter instance
 */
export function getRateLimiter(config?: Partial<RateLimitConfig>): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter(config);
  }
  return rateLimiterInstance;
}

/**
 * Resets the rate limiter instance (useful for testing)
 */
export function resetRateLimiter(): void {
  rateLimiterInstance = null;
}

export default RateLimiter;



