-- Create issues and issue_fact tables

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "issues" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "issue_id" text NOT NULL,
  "matter_id" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'draft',
  "priority" text NOT NULL DEFAULT 'medium',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uq_issues_issue_id" UNIQUE ("issue_id")
);

ALTER TABLE "issues" ADD CONSTRAINT IF NOT EXISTS "fk_issues_matter" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "idx_issues_matter_id" ON "issues" ("matter_id");

CREATE TABLE IF NOT EXISTS "issue_fact" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "issue_id" text NOT NULL,
  "fact_id" text NOT NULL,
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "issue_fact" ADD CONSTRAINT IF NOT EXISTS "fk_issue_fact_issue" FOREIGN KEY ("issue_id") REFERENCES "issues" ("issue_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issue_fact" ADD CONSTRAINT IF NOT EXISTS "fk_issue_fact_fact" FOREIGN KEY ("fact_id") REFERENCES "facts" ("fact_id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "uq_issue_fact_issue_fact" ON "issue_fact" ("issue_id", "fact_id");
CREATE INDEX IF NOT EXISTS "idx_issue_fact_issue_id" ON "issue_fact" ("issue_id");
CREATE INDEX IF NOT EXISTS "idx_issue_fact_fact_id" ON "issue_fact" ("fact_id");
