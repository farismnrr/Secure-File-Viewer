/**
 * PDF rendering utilities - convert PDF pages to images
 * Uses pdfjs-dist (v3.x legacy) for Node.js compatibility
 */

import { createCanvas } from 'canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

// Disable worker for Node.js in v3.x (uses fake worker)
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

// NodeCanvasFactory definition for pdfjs-dist
interface CanvasAndContext {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context: any;
}

class NodeCanvasFactory {
    create(width: number, height: number) {
        // @ts-expect-error - mismatch in context types between canvas and pdfjs-dist
        const canvas = createCanvas(width, height);
        // @ts-expect-error - context type mismatch
        const context = canvas.getContext('2d');
        return {
            canvas,
            context,
        };
    }

    reset(canvasAndContext: CanvasAndContext, width: number, height: number) {
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
    }

    destroy(canvasAndContext: CanvasAndContext) {
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
        canvasAndContext.canvas = null;
        canvasAndContext.context = null;
    }
}

export interface RenderOptions {
    scale?: number; // Default 2.0 for good quality
    format?: 'png' | 'jpeg';
}

export interface PageInfo {
    pageNumber: number;
    width: number;
    height: number;
}

/**
 * Get the number of pages in a PDF
 */
export async function getPageCount(pdfBuffer: Buffer): Promise<number> {
    const data = new Uint8Array(pdfBuffer);
    const doc = await pdfjsLib.getDocument({
        data,
        useSystemFonts: true,
        canvasFactory: new NodeCanvasFactory()
    }).promise;
    const count = doc.numPages;
    doc.destroy();
    return count;
}

/**
 * Render a single page of a PDF to an image buffer
 */
export async function renderPage(
    pdfBuffer: Buffer,
    pageNumber: number,
    options: RenderOptions = {}
): Promise<Buffer> {
    const { scale = 2.0 } = options;

    const data = new Uint8Array(pdfBuffer);
    const doc = await pdfjsLib.getDocument({
        data,
        useSystemFonts: true,
        canvasFactory: new NodeCanvasFactory()
    }).promise;

    if (pageNumber < 1 || pageNumber > doc.numPages) {
        doc.destroy();
        throw new Error(`Page ${pageNumber} does not exist. Document has ${doc.numPages} pages.`);
    }

    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    // Create canvas
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    // Render page to canvas - cast needed for node-canvas compatibility with pdfjs-dist
    await page.render({
        canvasContext: context,
        viewport,
    } as unknown as Parameters<typeof page.render>[0]).promise;

    // Convert to PNG buffer
    const buffer = canvas.toBuffer('image/png');

    // Cleanup
    page.cleanup();
    doc.destroy();

    return buffer;
}

/**
 * Get page dimensions without rendering
 */
export async function getPageInfo(
    pdfBuffer: Buffer,
    pageNumber: number
): Promise<PageInfo> {
    const data = new Uint8Array(pdfBuffer);
    const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;

    if (pageNumber < 1 || pageNumber > doc.numPages) {
        doc.destroy();
        throw new Error(`Page ${pageNumber} does not exist.`);
    }

    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.0 });

    const info: PageInfo = {
        pageNumber,
        width: Math.round(viewport.width),
        height: Math.round(viewport.height)
    };

    page.cleanup();
    doc.destroy();

    return info;
}

/**
 * Validate that a buffer is a valid PDF
 */
export async function isValidPdf(buffer: Buffer): Promise<boolean> {
    try {
        const data = new Uint8Array(buffer);
        const doc = await pdfjsLib.getDocument({ data }).promise;
        const valid = doc.numPages > 0;
        doc.destroy();
        return valid;
    } catch {
        return false;
    }
}
