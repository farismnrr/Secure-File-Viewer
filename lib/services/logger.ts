/**
 * Access logging service
 */

import { prisma } from '../prisma';

// =============================================================================
// Types
// =============================================================================

export interface LogEntry {
    id: number;
    doc_id: string;
    session_id: string | null;
    ip: string | null;
    user_agent: string | null;
    action: string;
    metadata: string | null;
    created_at: Date;
}

export type LogAction =
    | 'nonce_mint'
    | 'page_request'
    | 'invalid_nonce'
    | 'rate_limited'
    | 'fullscreen_exit'
    | 'capture_detected'
    | 'view'
    | 'print_attempt'
    | 'download_attempt'
    | 'auth_fail';

// =============================================================================
// Logging Functions
// =============================================================================

/**
 * Log an access event
 */
export async function logAccess(
    docId: string,
    action: LogAction,
    options: {
        sessionId?: string;
        ip?: string;
        userAgent?: string;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<void> {
    const metadataStr = options.metadata ? JSON.stringify(options.metadata) : null;

    await prisma.access_logs.create({
        data: {
            doc_id: docId,
            session_id: options.sessionId,
            ip: options.ip,
            user_agent: options.userAgent,
            action: action,
            metadata: metadataStr
        }
    });
}

/**
 * Get access logs for a document
 */
export async function getAccessLogs(
    docId: string,
    options: { limit?: number; offset?: number; action?: LogAction } = {}
): Promise<LogEntry[]> {
    const { limit = 100, offset = 0, action } = options;

    return prisma.access_logs.findMany({
        where: {
            doc_id: docId,
            ...(action && { action })
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset
    });
}

/**
 * Get logs by session ID
 */
export async function getLogsBySession(sessionId: string): Promise<LogEntry[]> {
    return prisma.access_logs.findMany({
        where: { session_id: sessionId },
        orderBy: { created_at: 'asc' }
    });
}

/**
 * Get recent suspicious activity
 */
export async function getSuspiciousActivity(
    options: { sinceMinutes?: number; minInvalidAttempts?: number } = {}
): Promise<{ ip: string; count: number }[]> {
    const { sinceMinutes = 60, minInvalidAttempts = 5 } = options;

    const dateThreshold = new Date();
    dateThreshold.setMinutes(dateThreshold.getMinutes() - sinceMinutes);

    const logs = await prisma.access_logs.groupBy({
        by: ['ip'],
        _count: {
            _all: true
        },
        where: {
            action: 'invalid_nonce',
            created_at: {
                gte: dateThreshold
            }
        },
        having: {
            ip: {
                _count: {
                    gte: minInvalidAttempts
                }
            }
        },
        orderBy: {
            _count: {
                ip: 'desc'
            }
        }
    });

    // Handle null ip? (ip is String? in schema). groupBy will skip nulls usually or group them.
    // We filter nulls if needed, but schema allows ip nullable.
    // Mapped to { ip, count }

    return logs
        .filter(l => l.ip !== null)
        .map(l => ({
            ip: l.ip as string,
            count: l._count._all
        }));
}
