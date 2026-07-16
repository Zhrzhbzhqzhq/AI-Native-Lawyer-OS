CREATE TABLE "fact_drafts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "draft_id" TEXT NOT NULL,
  "matter_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "confidence" DOUBLE PRECISION,
  "ai_reasoning" TEXT,
  "source_evidence_ids" JSONB NOT NULL,
  "review_status" TEXT NOT NULL DEFAULT 'pending',
  "lawyer_note" TEXT,
  "published_fact_id" TEXT,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "fact_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fact_drafts_draft_id_key" ON "fact_drafts"("draft_id");
CREATE INDEX "idx_fact_drafts_matter_id" ON "fact_drafts"("matter_id");
CREATE INDEX "idx_fact_drafts_matter_review_status" ON "fact_drafts"("matter_id", "review_status");

ALTER TABLE "fact_drafts"
ADD CONSTRAINT "fact_drafts_matter_id_fkey"
FOREIGN KEY ("matter_id") REFERENCES "matters"("matter_id")
ON DELETE RESTRICT ON UPDATE CASCADE;
