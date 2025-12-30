'use client';

/**
 * Viewer Page - /v/[docId]
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import FullscreenGuard from '@/components/FullscreenGuard';
import SecureViewer from '@/components/SecureViewer';

interface DocInfo {
    docId: string;
    title: string;
    pageCount: number;
    sessionId: string;
}

export default function ViewerPage() {
    const params = useParams();
    const docId = params.docId as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nonce, setNonce] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [docInfo, setDocInfo] = useState<DocInfo | null>(null);
    const [clientIp, setClientIp] = useState<string | undefined>();

    useEffect(() => {
        async function initViewer() {
            try {
                setLoading(true);
                setError(null);

                // Step 1: Mint nonce
                const mintResponse = await fetch('/api/nonces/mint', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ docId })
                });

                if (!mintResponse.ok) {
                    const errorData = await mintResponse.json();
                    throw new Error(errorData.error || 'Failed to initialize viewer');
                }

                const mintData = await mintResponse.json();
                setNonce(mintData.nonce);
                setSessionId(mintData.sessionId);

                // Step 2: Get document info
                const infoResponse = await fetch(`/api/docs/${docId}/info`, {
                    headers: { 'X-Nonce': mintData.nonce }
                });

                if (!infoResponse.ok) {
                    const errorData = await infoResponse.json();
                    throw new Error(errorData.error || 'Failed to load document info');
                }

                const info = await infoResponse.json();
                setDocInfo(info);

                // Try to get client IP (won't work on all browsers)
                try {
                    const ipResponse = await fetch('https://api.ipify.org?format=json');
                    const ipData = await ipResponse.json();
                    setClientIp(ipData.ip);
                } catch {
                    // IP detection failed, continue without it
                }

            } catch (err) {
                console.error('Viewer init error:', err);
                setError(err instanceof Error ? err.message : 'Failed to initialize viewer');
            } finally {
                setLoading(false);
            }
        }

        if (docId) {
            initViewer();
        }
    }, [docId]);

    const handleFullscreenExit = () => {
        console.log('Fullscreen exited - content blurred');
        // Optionally log this event
    };

    if (loading) {
        return (
            <div className="viewer-loading">
                <div className="loading-content">
                    <div className="spinner large" />
                    <p>Loading secure viewer...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="viewer-error-page">
                <div className="error-content">
                    <h1>⚠️ Error</h1>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!nonce || !sessionId || !docInfo) {
        return (
            <div className="viewer-error-page">
                <div className="error-content">
                    <h1>⚠️ Initialization Failed</h1>
                    <p>Could not initialize the document viewer.</p>
                    <button onClick={() => window.location.reload()}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <FullscreenGuard onFullscreenExit={handleFullscreenExit}>
            <SecureViewer
                docId={docId}
                nonce={nonce}
                sessionId={sessionId}
                title={docInfo.title}
                totalPages={docInfo.pageCount}
                clientIp={clientIp}
            />
        </FullscreenGuard>
    );
}
