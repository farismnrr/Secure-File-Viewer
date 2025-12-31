-- CreateTable
CREATE TABLE "nonces" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "doc_id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "access_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "doc_id" TEXT NOT NULL,
    "session_id" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "action" TEXT NOT NULL,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "documents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "doc_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "encrypted_path" TEXT NOT NULL,
    "content_type" TEXT DEFAULT 'application/pdf',
    "page_count" INTEGER,
    "is_encrypted" BOOLEAN NOT NULL DEFAULT false,
    "password_hash" TEXT,
    "watermark_policy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "nonces_nonce_key" ON "nonces"("nonce");

-- CreateIndex
CREATE INDEX "idx_nonces_doc_id" ON "nonces"("doc_id");

-- CreateIndex
CREATE INDEX "idx_nonces_nonce" ON "nonces"("nonce");

-- CreateIndex
CREATE INDEX "idx_access_logs_doc_id" ON "access_logs"("doc_id");

-- CreateIndex
CREATE UNIQUE INDEX "documents_doc_id_key" ON "documents"("doc_id");

-- CreateIndex
CREATE INDEX "idx_documents_tenant" ON "documents"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_documents_doc_id" ON "documents"("doc_id");

-- CreateIndex
CREATE INDEX "idx_documents_status" ON "documents"("status");

-- CreateIndex
CREATE INDEX "idx_documents_created_by" ON "documents"("created_by");
