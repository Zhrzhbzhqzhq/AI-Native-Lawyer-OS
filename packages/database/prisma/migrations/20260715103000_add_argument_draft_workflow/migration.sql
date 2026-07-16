-- CreateTable
CREATE TABLE "argument_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "matter_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" TEXT,
    "reasoning" TEXT,
    "counter_argument" TEXT,
    "response" TEXT,
    "risk" TEXT,
    "conclusion" TEXT,
    "confidence" DOUBLE PRECISION,
    "ai_reasoning" TEXT,
    "source_fact_ids" JSONB NOT NULL,
    "source_issue_ids" JSONB NOT NULL,
    "source_law_ids" JSONB NOT NULL,
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "lawyer_note" TEXT,
    "published_argument_id" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "argument_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "argument_fact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "argument_id" TEXT NOT NULL,
    "fact_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "argument_fact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "argument_issue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "argument_id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "argument_issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "argument_law" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "argument_id" TEXT NOT NULL,
    "law_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "argument_law_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_argument_drafts_matter_id" ON "argument_drafts"("matter_id");

-- CreateIndex
CREATE INDEX "idx_argument_drafts_matter_review_status" ON "argument_drafts"("matter_id", "review_status");

-- CreateIndex
CREATE INDEX "idx_argument_fact_argument_id" ON "argument_fact"("argument_id");

-- CreateIndex
CREATE INDEX "idx_argument_fact_fact_id" ON "argument_fact"("fact_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_argument_fact_argument_fact" ON "argument_fact"("argument_id", "fact_id");

-- CreateIndex
CREATE INDEX "idx_argument_issue_argument_id" ON "argument_issue"("argument_id");

-- CreateIndex
CREATE INDEX "idx_argument_issue_issue_id" ON "argument_issue"("issue_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_argument_issue_argument_issue" ON "argument_issue"("argument_id", "issue_id");

-- CreateIndex
CREATE INDEX "idx_argument_law_argument_id" ON "argument_law"("argument_id");

-- CreateIndex
CREATE INDEX "idx_argument_law_law_id" ON "argument_law"("law_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_argument_law_argument_law" ON "argument_law"("argument_id", "law_id");

-- AddForeignKey
ALTER TABLE "argument_drafts" ADD CONSTRAINT "argument_drafts_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "argument_fact" ADD CONSTRAINT "argument_fact_argument_id_fkey" FOREIGN KEY ("argument_id") REFERENCES "arguments"("argument_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "argument_fact" ADD CONSTRAINT "argument_fact_fact_id_fkey" FOREIGN KEY ("fact_id") REFERENCES "facts"("fact_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "argument_issue" ADD CONSTRAINT "argument_issue_argument_id_fkey" FOREIGN KEY ("argument_id") REFERENCES "arguments"("argument_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "argument_issue" ADD CONSTRAINT "argument_issue_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("issue_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "argument_law" ADD CONSTRAINT "argument_law_argument_id_fkey" FOREIGN KEY ("argument_id") REFERENCES "arguments"("argument_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "argument_law" ADD CONSTRAINT "argument_law_law_id_fkey" FOREIGN KEY ("law_id") REFERENCES "laws"("law_id") ON DELETE CASCADE ON UPDATE CASCADE;
