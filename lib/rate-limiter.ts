/**
 * Rate limiting utilities (In-Memory)
 */

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10)
};

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
}

interface RateLimitEntry {
    count: number;
    windowStart: number;
}

// In-memory store: Map<"ip:endpoint", RateLimitEntry>
// Note: This resets on server restart, which is acceptable for rate limiting.
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.windowStart + 60000) { // Assuming max window is ~1 min usually
            rateLimitStore.delete(key);
        }
    }
}, CLEANUP_INTERVAL).unref(); // unref so it doesn't keep process alive

/**
 * Check if a request is within rate limits
 */
export function checkRateLimit(
    ip: string,
    endpoint: string,
    config: RateLimitConfig = DEFAULT_CONFIG
): RateLimitResult {
    const key = `${ip}:${endpoint}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let entry = rateLimitStore.get(key);

    // If no entry or window expired, reset
    if (!entry || entry.windowStart < windowStart) {
        entry = {
            count: 1,
            windowStart: now
        };
        rateLimitStore.set(key, entry);

        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetAt: new Date(now + config.windowMs)
        };
    }

    // Window active, check count
    if (entry.count >= config.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: new Date(entry.windowStart + config.windowMs)
        };
    }

    // Increment
    entry.count++;
    return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetAt: new Date(entry.windowStart + config.windowMs)
    };
}

/**
 * Reset rate limit for an IP (admin use or testing)
 */
export function resetRateLimit(ip: string, endpoint?: string): void {
    if (endpoint) {
        rateLimitStore.delete(`${ip}:${endpoint}`);
    } else {
        // Delete all keys starting with IP
        for (const key of rateLimitStore.keys()) {
            if (key.startsWith(`${ip}:`)) {
                rateLimitStore.delete(key);
            }
        }
    }
}

/**
 * Clear all rate limits (for testing)
 */
export function clearAllRateLimits(): void {
    rateLimitStore.clear();
}

/**
 * Get rate limit info for an IP
 */
export function getRateLimitInfo(
    ip: string,
    endpoint: string,
    config: RateLimitConfig = DEFAULT_CONFIG
): RateLimitResult | null {
    const key = `${ip}:${endpoint}`;
    const entry = rateLimitStore.get(key);

    if (!entry) return null;

    const now = Date.now();
    if (entry.windowStart + config.windowMs < now) {
        return null; // Expired
    }

    return {
        allowed: entry.count < config.maxRequests,
        remaining: Math.max(0, config.maxRequests - entry.count),
        resetAt: new Date(entry.windowStart + config.windowMs)
    };
}
