-- CreateTable
CREATE TABLE "issue_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "matter_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "confidence" DOUBLE PRECISION,
    "ai_reasoning" TEXT,
    "source_fact_ids" JSONB NOT NULL,
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "lawyer_note" TEXT,
    "published_issue_id" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issue_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_issue_drafts_matter_id" ON "issue_drafts"("matter_id");

-- CreateIndex
CREATE INDEX "idx_issue_drafts_matter_review_status" ON "issue_drafts"("matter_id", "review_status");

-- AddForeignKey
ALTER TABLE "issue_drafts" ADD CONSTRAINT "issue_drafts_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE;
