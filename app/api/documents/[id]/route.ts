/**
 * Document API - Single Document Operations
 * GET /api/documents/[id] - Get document detail
 * PUT /api/documents/[id] - Update document
 * DELETE /api/documents/[id] - Soft delete document
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/utils/crypto';
import { extractAuthInfo } from '@/lib/auth/helper';
import fs from 'fs';
import path from 'path';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// =============================================================================
// GET - Get document detail
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: docId } = await params;
        const { tenantId } = extractAuthInfo(request);

        if (!tenantId) {
            return NextResponse.json(
                { status: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const document = await prisma.documents.findUnique({
            where: {
                doc_id: docId
            }
        });

        // Ensure tenant match
        if (!document || document.tenant_id !== tenantId) {
            return NextResponse.json(
                { status: false, message: 'Document not found' },
                { status: 404 }
            );
        }

        // Parse watermark policy
        let watermarkPolicy = null;
        try {
            watermarkPolicy = document.watermark_policy
                ? JSON.parse(document.watermark_policy)
                : null;
        } catch {
            // Ignore parse errors
        }

        return NextResponse.json({
            status: true,
            data: {
                id: document.id,
                docId: document.doc_id,
                title: document.title,
                contentType: document.content_type,
                pageCount: document.page_count,
                isEncrypted: document.is_encrypted,
                hasPassword: Boolean(document.password_hash),
                watermarkPolicy,
                status: document.status,
                createdBy: document.created_by,
                createdAt: document.created_at,
                updatedAt: document.updated_at,
                viewUrl: `/v/${document.doc_id}`
            }
        });
    } catch (error) {

        return NextResponse.json(
            { status: false, message: 'Failed to get document' },
            { status: 500 }
        );
    }
}

// =============================================================================
// PUT - Update document
// =============================================================================

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: docId } = await params;
        const { tenantId } = extractAuthInfo(request);

        if (!tenantId) {
            return NextResponse.json(
                { status: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check document exists and belongs to tenant
        const existing = await prisma.documents.findUnique({
            where: { doc_id: docId }
        });

        if (!existing || existing.tenant_id !== tenantId) {
            return NextResponse.json(
                { status: false, message: 'Document not found' },
                { status: 404 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { title, status, watermarkPolicy } = body;

        const updateData: any = {
            updated_at: new Date()
        };

        if (title !== undefined) updateData.title = title.trim();
        if (status !== undefined) {
            if (!['active', 'inactive'].includes(status)) {
                return NextResponse.json(
                    { status: false, message: 'Invalid status. Must be "active" or "inactive"' },
                    { status: 400 }
                );
            }
            updateData.status = status;
        }
        if (watermarkPolicy !== undefined) updateData.watermark_policy = JSON.stringify(watermarkPolicy);

        // Handle password update
        if (body.password !== undefined) {
            if (body.password === '' || body.password === null) {
                // Remove password
                updateData.password_hash = null;
                // Optionally disable encryption flag if it implies password? 
                // Legacy code did `is_encrypted = 0`.
                updateData.is_encrypted = false;
            } else {
                // Set new password
                updateData.password_hash = await hashPassword(body.password);
                updateData.is_encrypted = true;
            }
        }

        if (Object.keys(updateData).length <= 1) { // 1 because updated_at is always there
            return NextResponse.json(
                { status: false, message: 'No fields to update' },
                { status: 400 }
            );
        }

        await prisma.documents.update({
            where: { doc_id: docId },
            data: updateData
        });

        return NextResponse.json({
            status: true,
            message: 'Document updated successfully'
        });
    } catch (error) {

        return NextResponse.json(
            { status: false, message: 'Failed to update document' },
            { status: 500 }
        );
    }
}

// =============================================================================
// DELETE - Soft delete document
// =============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: docId } = await params;
        const { tenantId } = extractAuthInfo(request);

        if (!tenantId) {
            return NextResponse.json(
                { status: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check document exists and belongs to tenant
        const existing = await prisma.documents.findUnique({
            where: { doc_id: docId }
        });

        if (!existing || existing.tenant_id !== tenantId) {
            return NextResponse.json(
                { status: false, message: 'Document not found' },
                { status: 404 }
            );
        }

        // Check if hard delete requested
        const { searchParams } = new URL(request.url);
        const hardDelete = searchParams.get('hard') === 'true';

        if (hardDelete) {
            // Delete file from storage
            const filePath = path.join(process.cwd(), existing.encrypted_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // Delete from database
            await prisma.documents.delete({
                where: { doc_id: docId }
            });

            return NextResponse.json({
                status: true,
                message: 'Document permanently deleted'
            });
        }

        // Soft delete - just update status
        await prisma.documents.update({
            where: { doc_id: docId },
            data: {
                status: 'inactive',
                updated_at: new Date()
            }
        });

        return NextResponse.json({
            status: true,
            message: 'Document deleted successfully'
        });
    } catch (error) {

        return NextResponse.json(
            { status: false, message: 'Failed to delete document' },
            { status: 500 }
        );
    }
}
