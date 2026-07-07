-- Migration: add_fact_models

-- Ensure uuid extension exists (safe to run if already present)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create facts table
CREATE TABLE IF NOT EXISTS "facts" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "fact_id" text NOT NULL UNIQUE,
  "matter_id" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Index on matter_id
CREATE INDEX IF NOT EXISTS "idx_facts_matter_id" ON "facts"("matter_id");

-- Foreign key to matters(matter_id)
ALTER TABLE "facts"
  ADD CONSTRAINT "fk_facts_matter"
  FOREIGN KEY ("matter_id") REFERENCES "matters"("matter_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create fact_evidence join table
CREATE TABLE IF NOT EXISTS "fact_evidence" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "fact_id" text NOT NULL,
  "evidence_id" text NOT NULL,
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint on (fact_id, evidence_id)
ALTER TABLE "fact_evidence"
  ADD CONSTRAINT "uq_fact_evidence_fact_evidence" UNIQUE ("fact_id", "evidence_id");

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_fact_evidence_fact_id" ON "fact_evidence"("fact_id");
CREATE INDEX IF NOT EXISTS "idx_fact_evidence_evidence_id" ON "fact_evidence"("evidence_id");

-- Foreign keys: fact_id -> facts(fact_id), evidence_id -> evidence(evidence_id)
ALTER TABLE "fact_evidence"
  ADD CONSTRAINT "fk_fact_evidence_fact"
  FOREIGN KEY ("fact_id") REFERENCES "facts"("fact_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fact_evidence"
  ADD CONSTRAINT "fk_fact_evidence_evidence"
  FOREIGN KEY ("evidence_id") REFERENCES "evidence"("evidence_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
