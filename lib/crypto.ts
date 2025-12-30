/**
 * Cryptographic utilities for AES-256-GCM encryption/decryption
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;

/**
 * Get the master key from environment
 */
export function getMasterKey(): Buffer {
    const keyHex = process.env.ENCRYPTION_MASTER_KEY;
    if (!keyHex || keyHex.length !== 64) {
        throw new Error('ENCRYPTION_MASTER_KEY must be a 64-character hex string (32 bytes)');
    }
    return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt a buffer using AES-256-GCM
 * Output format: [IV (12 bytes)][Auth Tag (16 bytes)][Ciphertext]
 */
export function encryptBuffer(plainBuffer: Buffer, key: Buffer): Buffer {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(plainBuffer),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Combine: IV + AuthTag + Ciphertext
    return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypt a buffer encrypted with encryptBuffer
 */
export function decryptBuffer(encryptedBuffer: Buffer, key: Buffer): Buffer {
    if (encryptedBuffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
        throw new Error('Invalid encrypted data: too short');
    }

    const iv = encryptedBuffer.subarray(0, IV_LENGTH);
    const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = encryptedBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
    ]);
}

/**
 * Generate a cryptographically secure nonce
 */
export function generateNonce(): string {
    return crypto.randomBytes(24).toString('hex');
}

/**
 * Generate a session ID
 */
export function generateSessionId(): string {
    return crypto.randomUUID();
}
