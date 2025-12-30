/**
 * API: Mint nonce for document access
 * POST /api/nonces/mint
 */

import { NextRequest, NextResponse } from 'next/server';
import { mintNonce } from '@/lib/nonce';
import { getDocument } from '@/lib/registry';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAccess } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        // Get client IP
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || request.headers.get('x-real-ip')
            || 'unknown';

        // Rate limiting
        const rateLimit = checkRateLimit(ip, '/api/nonces/mint');
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please try again later.' },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': rateLimit.resetAt.toISOString()
                    }
                }
            );
        }

        // Parse body
        const body = await request.json();
        const { docId } = body;

        if (!docId || typeof docId !== 'string') {
            return NextResponse.json(
                { error: 'docId is required' },
                { status: 400 }
            );
        }

        // Check if document exists
        const document = getDocument(docId);
        if (!document || document.status !== 'active') {
            return NextResponse.json(
                { error: 'Document not found' },
                { status: 404 }
            );
        }

        // Mint new nonce
        const nonceData = mintNonce(docId);

        // Log access
        logAccess(docId, 'nonce_mint', {
            sessionId: nonceData.sessionId,
            ip,
            userAgent: request.headers.get('user-agent') || undefined
        });

        return NextResponse.json({
            nonce: nonceData.nonce,
            sessionId: nonceData.sessionId,
            issuedAt: nonceData.issuedAt
        }, {
            headers: {
                'X-RateLimit-Remaining': rateLimit.remaining.toString()
            }
        });

    } catch (error) {
        console.error('Error minting nonce:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
