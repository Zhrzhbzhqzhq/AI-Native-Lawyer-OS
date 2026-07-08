
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "laws" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "law_id" text NOT NULL,
  "matter_id" text NOT NULL,
  "issue_id" text,
  "title" text NOT NULL,
  "citation" text,
  "description" text,
  "status" text NOT NULL DEFAULT 'draft',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uq_laws_law_id" UNIQUE ("law_id")
);

ALTER TABLE "laws" ADD CONSTRAINT "fk_laws_matter" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "idx_laws_matter_id" ON "laws" ("matter_id");

ALTER TABLE "laws" ADD CONSTRAINT "fk_laws_issue" FOREIGN KEY ("issue_id") REFERENCES "issues" ("issue_id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "idx_laws_issue_id" ON "laws" ("issue_id");
