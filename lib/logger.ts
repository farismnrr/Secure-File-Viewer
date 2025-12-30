/**
 * Access logging utilities
 */

import { getDb } from './db';

export interface LogEntry {
    id: number;
    doc_id: string;
    session_id: string | null;
    ip: string | null;
    user_agent: string | null;
    action: string;
    metadata: string | null;
    created_at: string;
}

export type LogAction =
    | 'nonce_mint'
    | 'page_request'
    | 'invalid_nonce'
    | 'rate_limited'
    | 'fullscreen_exit'
    | 'capture_detected';

/**
 * Log an access event
 */
export function logAccess(
    docId: string,
    action: LogAction,
    options: {
        sessionId?: string;
        ip?: string;
        userAgent?: string;
        metadata?: Record<string, unknown>;
    } = {}
): void {
    const db = getDb();

    const stmt = db.prepare(`
    INSERT INTO access_logs (doc_id, session_id, ip, user_agent, action, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

    stmt.run(
        docId,
        options.sessionId || null,
        options.ip || null,
        options.userAgent || null,
        action,
        options.metadata ? JSON.stringify(options.metadata) : null
    );
}

/**
 * Get access logs for a document
 */
export function getAccessLogs(
    docId: string,
    options: {
        limit?: number;
        offset?: number;
        action?: LogAction;
    } = {}
): LogEntry[] {
    const db = getDb();
    const { limit = 100, offset = 0, action } = options;

    let query = `SELECT * FROM access_logs WHERE doc_id = ?`;
    const params: (string | number)[] = [docId];

    if (action) {
        query += ` AND action = ?`;
        params.push(action);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params) as LogEntry[];
}

/**
 * Get logs by session ID
 */
export function getLogsBySession(sessionId: string): LogEntry[] {
    const db = getDb();

    const stmt = db.prepare(`
    SELECT * FROM access_logs 
    WHERE session_id = ? 
    ORDER BY created_at ASC
  `);

    return stmt.all(sessionId) as LogEntry[];
}

/**
 * Get recent suspicious activity
 */
export function getSuspiciousActivity(options: {
    sinceMinutes?: number;
    minInvalidAttempts?: number;
} = {}): { ip: string; count: number }[] {
    const db = getDb();
    const { sinceMinutes = 60, minInvalidAttempts = 5 } = options;

    const stmt = db.prepare(`
    SELECT ip, COUNT(*) as count
    FROM access_logs
    WHERE action = 'invalid_nonce'
    AND created_at >= datetime('now', ?)
    GROUP BY ip
    HAVING count >= ?
    ORDER BY count DESC
  `);

    return stmt.all(`-${sinceMinutes} minutes`, minInvalidAttempts) as { ip: string; count: number }[];
}
