/**
 * Nonce management - single-use tokens for document access
 */

import { prisma } from '../prisma';
import { generateNonce as cryptoGenerateNonce, generateSessionId } from '../utils';

// =============================================================================
// Types
// =============================================================================

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
    used: boolean;
    created_at: Date;
}

// =============================================================================
// Nonce Operations
// =============================================================================

/**
 * Create a new nonce for a document
 */
export async function mintNonce(docId: string): Promise<NonceData> {
    const nonce = cryptoGenerateNonce();
    const sessionId = generateSessionId();
    const issuedAt = new Date();

    await prisma.nonces.create({
        data: {
            doc_id: docId,
            nonce: nonce,
            session_id: sessionId,
            created_at: issuedAt,
            used: false
        }
    });

    return { nonce, sessionId, docId, issuedAt: issuedAt.toISOString() };
}

/**
 * Validate a nonce without consuming it
 */
export async function isNonceValid(docId: string, nonce: string): Promise<boolean> {
    const record = await prisma.nonces.findUnique({
        where: { nonce },
    });

    if (!record) return false;

    // Check fields matches
    if (record.doc_id !== docId) return false;
    if (record.used) return false;

    return true;
}

/**
 * Validate and consume a nonce (mark as used)
 * Returns the session ID if valid, null otherwise
 */
export async function validateAndConsumeNonce(docId: string, nonce: string): Promise<string | null> {

    // Use transaction to check and update atomically? 
    // Or just simple check first. Prisma update w/ where clause.
    // If we use findUnique, we can check.

    // Since nonce is unique, we can try to update directly if unused.
    // updateMany returns count. update throws if not found.

    // Logic: Find unused nonce matching docId.
    const record = await prisma.nonces.findFirst({
        where: {
            nonce,
            doc_id: docId,
            used: false
        }
    });

    if (!record) return null;

    // Mark as used
    await prisma.nonces.update({
        where: { id: record.id },
        data: { used: true }
    });

    return record.session_id;
}

/**
 * Get nonce info without consuming
 */
export async function getNonceInfo(nonce: string): Promise<NonceRecord | null> {
    return prisma.nonces.findUnique({
        where: { nonce }
    });
}

/**
 * Clean up old nonces
 */
export async function cleanupOldNonces(olderThanDays: number = 7): Promise<number> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - olderThanDays);

    const result = await prisma.nonces.deleteMany({
        where: {
            created_at: {
                lt: dateThreshold
            }
        }
    });

    return result.count;
}
