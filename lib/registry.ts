/**
 * Document registry management
 */

import fs from 'fs';
import path from 'path';

export interface DocumentMetadata {
    docId: string;
    title: string;
    encryptedPath: string;
    contentType: string;
    pageCount?: number;
    watermarkPolicy: {
        showIp: boolean;
        showTimestamp: boolean;
        showSessionId: boolean;
        customText?: string;
    };
    status: 'active' | 'inactive';
    createdAt: string;
    updatedAt: string;
}

interface RegistryData {
    documents: DocumentMetadata[];
}

const REGISTRY_PATH = path.join(process.cwd(), 'data', 'registry.json');

/**
 * Load registry from disk
 */
function loadRegistry(): RegistryData {
    try {
        const data = fs.readFileSync(REGISTRY_PATH, 'utf-8');
        return JSON.parse(data);
    } catch {
        return { documents: [] };
    }
}

/**
 * Save registry to disk
 */
function saveRegistry(registry: RegistryData): void {
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

/**
 * Get all active documents
 */
export function listDocuments(): DocumentMetadata[] {
    const registry = loadRegistry();
    return registry.documents.filter(doc => doc.status === 'active');
}

/**
 * Get a specific document by ID
 */
export function getDocument(docId: string): DocumentMetadata | null {
    const registry = loadRegistry();
    return registry.documents.find(doc => doc.docId === docId) || null;
}

/**
 * Add or update a document in registry
 */
export function upsertDocument(doc: DocumentMetadata): void {
    const registry = loadRegistry();
    const index = registry.documents.findIndex(d => d.docId === doc.docId);

    if (index >= 0) {
        registry.documents[index] = { ...doc, updatedAt: new Date().toISOString() };
    } else {
        registry.documents.push({
            ...doc,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    saveRegistry(registry);
}

/**
 * Deactivate a document
 */
export function deactivateDocument(docId: string): boolean {
    const registry = loadRegistry();
    const doc = registry.documents.find(d => d.docId === docId);

    if (doc) {
        doc.status = 'inactive';
        doc.updatedAt = new Date().toISOString();
        saveRegistry(registry);
        return true;
    }

    return false;
}

/**
 * Check if document exists and is active
 */
export function isDocumentActive(docId: string): boolean {
    const doc = getDocument(docId);
    return doc?.status === 'active';
}
