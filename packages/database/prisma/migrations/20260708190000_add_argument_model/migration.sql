-- Create arguments table

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "arguments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "argument_id" text NOT NULL,
  "matter_id" text NOT NULL,
  "issue_id" text,
  "title" text NOT NULL,
  "description" text,
  "conclusion" text,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uq_arguments_argument_id" UNIQUE ("argument_id")
);

ALTER TABLE "arguments" ADD CONSTRAINT IF NOT EXISTS "fk_arguments_matter" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "idx_arguments_matter_id" ON "arguments" ("matter_id");

ALTER TABLE "arguments" ADD CONSTRAINT IF NOT EXISTS "fk_arguments_issue" FOREIGN KEY ("issue_id") REFERENCES "issues" ("issue_id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "idx_arguments_issue_id" ON "arguments" ("issue_id");
