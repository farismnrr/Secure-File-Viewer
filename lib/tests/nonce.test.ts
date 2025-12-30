/**
 * Unit tests for nonce management
 */

import { mintNonce, isNonceValid, validateAndConsumeNonce, getNonceInfo } from '../nonce';
import { resetDb, closeDb } from '../db';

describe('Nonce Management', () => {
    beforeEach(() => {
        resetDb();
    });

    afterAll(() => {
        closeDb();
    });

    describe('mintNonce', () => {
        it('should create a new nonce with all required fields', () => {
            const result = mintNonce('doc-123');

            expect(result.nonce).toBeDefined();
            expect(result.nonce).toHaveLength(48); // 24 bytes hex
            expect(result.sessionId).toBeDefined();
            expect(result.docId).toBe('doc-123');
            expect(result.issuedAt).toBeDefined();
        });

        it('should create unique nonces for same document', () => {
            const nonce1 = mintNonce('doc-123');
            const nonce2 = mintNonce('doc-123');

            expect(nonce1.nonce).not.toBe(nonce2.nonce);
            expect(nonce1.sessionId).not.toBe(nonce2.sessionId);
        });
    });

    describe('isNonceValid', () => {
        it('should return true for a valid unused nonce', () => {
            const { nonce, docId } = mintNonce('doc-123');

            expect(isNonceValid(docId, nonce)).toBe(true);
        });

        it('should return false for non-existent nonce', () => {
            expect(isNonceValid('doc-123', 'fake-nonce')).toBe(false);
        });

        it('should return false for wrong document ID', () => {
            const { nonce } = mintNonce('doc-123');

            expect(isNonceValid('doc-456', nonce)).toBe(false);
        });
    });

    describe('validateAndConsumeNonce', () => {
        it('should return session ID for valid nonce and mark as used', () => {
            const { nonce, docId, sessionId } = mintNonce('doc-123');

            const result = validateAndConsumeNonce(docId, nonce);

            expect(result).toBe(sessionId);
            expect(isNonceValid(docId, nonce)).toBe(false); // Now marked as used
        });

        it('should return null for already used nonce (single-use)', () => {
            const { nonce, docId } = mintNonce('doc-123');

            // First use
            validateAndConsumeNonce(docId, nonce);

            // Second attempt should fail
            const result = validateAndConsumeNonce(docId, nonce);
            expect(result).toBeNull();
        });

        it('should return null for invalid nonce', () => {
            const result = validateAndConsumeNonce('doc-123', 'invalid-nonce');
            expect(result).toBeNull();
        });
    });

    describe('getNonceInfo', () => {
        it('should return nonce record when exists', () => {
            const { nonce, docId, sessionId } = mintNonce('doc-123');

            const info = getNonceInfo(nonce);

            expect(info).not.toBeNull();
            expect(info?.doc_id).toBe(docId);
            expect(info?.session_id).toBe(sessionId);
            expect(info?.used).toBe(0);
        });

        it('should return null for non-existent nonce', () => {
            const info = getNonceInfo('non-existent');
            expect(info).toBeNull();
        });
    });
});
