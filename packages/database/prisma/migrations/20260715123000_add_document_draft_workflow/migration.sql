-- CreateTable
CREATE TABLE "document_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "matter_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source_argument_ids" JSONB NOT NULL,
    "source_fact_ids" JSONB NOT NULL,
    "source_issue_ids" JSONB NOT NULL,
    "source_law_ids" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "ai_reasoning" TEXT,
    "review_status" TEXT NOT NULL DEFAULT 'generated',
    "lawyer_note" TEXT,
    "published_document_id" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_argument" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" TEXT NOT NULL,
    "argument_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_argument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_fact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" TEXT NOT NULL,
    "fact_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_fact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_issue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_law" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" TEXT NOT NULL,
    "law_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_law_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_document_drafts_matter_id" ON "document_drafts"("matter_id");

-- CreateIndex
CREATE INDEX "idx_document_drafts_matter_type" ON "document_drafts"("matter_id", "document_type");

-- CreateIndex
CREATE INDEX "idx_document_drafts_matter_review_status" ON "document_drafts"("matter_id", "review_status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_document_argument_document_argument" ON "document_argument"("document_id", "argument_id");

-- CreateIndex
CREATE INDEX "idx_document_argument_document_id" ON "document_argument"("document_id");

-- CreateIndex
CREATE INDEX "idx_document_argument_argument_id" ON "document_argument"("argument_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_document_fact_document_fact" ON "document_fact"("document_id", "fact_id");

-- CreateIndex
CREATE INDEX "idx_document_fact_document_id" ON "document_fact"("document_id");

-- CreateIndex
CREATE INDEX "idx_document_fact_fact_id" ON "document_fact"("fact_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_document_issue_document_issue" ON "document_issue"("document_id", "issue_id");

-- CreateIndex
CREATE INDEX "idx_document_issue_document_id" ON "document_issue"("document_id");

-- CreateIndex
CREATE INDEX "idx_document_issue_issue_id" ON "document_issue"("issue_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_document_law_document_law" ON "document_law"("document_id", "law_id");

-- CreateIndex
CREATE INDEX "idx_document_law_document_id" ON "document_law"("document_id");

-- CreateIndex
CREATE INDEX "idx_document_law_law_id" ON "document_law"("law_id");

-- AddForeignKey
ALTER TABLE "document_drafts" ADD CONSTRAINT "document_drafts_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_argument" ADD CONSTRAINT "document_argument_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_argument" ADD CONSTRAINT "document_argument_argument_id_fkey" FOREIGN KEY ("argument_id") REFERENCES "arguments"("argument_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_fact" ADD CONSTRAINT "document_fact_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_fact" ADD CONSTRAINT "document_fact_fact_id_fkey" FOREIGN KEY ("fact_id") REFERENCES "facts"("fact_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_issue" ADD CONSTRAINT "document_issue_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_issue" ADD CONSTRAINT "document_issue_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("issue_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_law" ADD CONSTRAINT "document_law_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_law" ADD CONSTRAINT "document_law_law_id_fkey" FOREIGN KEY ("law_id") REFERENCES "laws"("law_id") ON DELETE CASCADE ON UPDATE CASCADE;
