-- CreateTable
CREATE TABLE "law_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "matter_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "citation" TEXT,
    "rule_content" TEXT,
    "application" TEXT,
    "limitations" TEXT,
    "jurisdiction" TEXT,
    "source_reference" TEXT,
    "confidence" DOUBLE PRECISION,
    "ai_reasoning" TEXT,
    "source_issue_ids" JSONB NOT NULL,
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "lawyer_note" TEXT,
    "published_law_id" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "law_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "law_issue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "law_id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "law_issue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_law_drafts_matter_id" ON "law_drafts"("matter_id");

-- CreateIndex
CREATE INDEX "idx_law_drafts_matter_review_status" ON "law_drafts"("matter_id", "review_status");

-- CreateIndex
CREATE INDEX "idx_law_issue_law_id" ON "law_issue"("law_id");

-- CreateIndex
CREATE INDEX "idx_law_issue_issue_id" ON "law_issue"("issue_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_law_issue_law_issue" ON "law_issue"("law_id", "issue_id");

-- AddForeignKey
ALTER TABLE "law_drafts" ADD CONSTRAINT "law_drafts_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "law_issue" ADD CONSTRAINT "law_issue_law_id_fkey" FOREIGN KEY ("law_id") REFERENCES "laws"("law_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "law_issue" ADD CONSTRAINT "law_issue_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("issue_id") ON DELETE CASCADE ON UPDATE CASCADE;
