'use client';

/**
 * Watermark Overlay - CSS-based repeating watermark
 */

interface WatermarkOverlayProps {
    ip?: string;
    timestamp?: string;
    sessionId?: string;
    customText?: string;
}

export default function WatermarkOverlay({ ip, timestamp, sessionId, customText }: WatermarkOverlayProps) {
    const parts: string[] = [];
    if (ip) parts.push(`IP: ${ip}`);
    if (timestamp) parts.push(new Date(timestamp).toLocaleString());
    if (sessionId) parts.push(`Session: ${sessionId.substring(0, 8)}`);
    if (customText) parts.push(customText);

    const watermarkText = parts.join(' | ') || 'CONFIDENTIAL';

    return (
        <div
            className="watermark-overlay"
            style={{
                ['--watermark-text' as string]: `"${watermarkText}"`
            }}
            aria-hidden="true"
        />
    );
}
