-- Add argument_id and content to documents table

ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "argument_id" text;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "content" text;

ALTER TABLE "documents" ADD CONSTRAINT IF NOT EXISTS "fk_documents_argument" FOREIGN KEY ("argument_id") REFERENCES "arguments" ("argument_id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "idx_documents_argument_id" ON "documents" ("argument_id");
