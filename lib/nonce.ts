/**
 * Nonce management - single-use tokens for document access
 */

import { getDb } from './db';
import { generateNonce as cryptoGenerateNonce, generateSessionId } from './crypto';

export interface NonceData {
    nonce: string;
    sessionId: string;
    docId: string;
    issuedAt: string;
}

export interface NonceRecord {
    id: number;
    doc_id: string;
    nonce: string;
    session_id: string;
    used: number;
    created_at: string;
}

/**
 * Create a new nonce for a document
 */
export function mintNonce(docId: string): NonceData {
    const db = getDb();
    const nonce = cryptoGenerateNonce();
    const sessionId = generateSessionId();
    const issuedAt = new Date().toISOString();

    const stmt = db.prepare(`
    INSERT INTO nonces (doc_id, nonce, session_id, created_at)
    VALUES (?, ?, ?, ?)
  `);

    stmt.run(docId, nonce, sessionId, issuedAt);

    return {
        nonce,
        sessionId,
        docId,
        issuedAt
    };
}

/**
 * Validate a nonce without consuming it
 */
export function isNonceValid(docId: string, nonce: string): boolean {
    const db = getDb();

    const stmt = db.prepare(`
    SELECT * FROM nonces 
    WHERE doc_id = ? AND nonce = ? AND used = 0
  `);

    const result = stmt.get(docId, nonce) as NonceRecord | undefined;
    return !!result;
}

/**
 * Validate and consume a nonce (mark as used)
 * Returns the session ID if valid, null otherwise
 */
export function validateAndConsumeNonce(docId: string, nonce: string): string | null {
    const db = getDb();

    // Check if nonce exists and is not used
    const selectStmt = db.prepare(`
    SELECT session_id FROM nonces 
    WHERE doc_id = ? AND nonce = ? AND used = 0
  `);

    const result = selectStmt.get(docId, nonce) as { session_id: string } | undefined;

    if (!result) {
        return null;
    }

    // Mark as used
    const updateStmt = db.prepare(`
    UPDATE nonces SET used = 1 WHERE doc_id = ? AND nonce = ?
  `);

    updateStmt.run(docId, nonce);

    return result.session_id;
}

/**
 * Get nonce info without consuming
 */
export function getNonceInfo(nonce: string): NonceRecord | null {
    const db = getDb();

    const stmt = db.prepare(`SELECT * FROM nonces WHERE nonce = ?`);
    const result = stmt.get(nonce) as NonceRecord | undefined;

    return result || null;
}

/**
 * Clean up old nonces (optional maintenance)
 */
export function cleanupOldNonces(olderThanDays: number = 7): number {
    const db = getDb();

    const stmt = db.prepare(`
    DELETE FROM nonces 
    WHERE created_at < datetime('now', ?)
  `);

    const result = stmt.run(`-${olderThanDays} days`);
    return result.changes;
}
