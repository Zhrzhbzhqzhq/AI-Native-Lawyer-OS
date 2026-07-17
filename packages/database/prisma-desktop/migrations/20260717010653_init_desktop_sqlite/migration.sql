-- CreateTable
CREATE TABLE "matters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matter_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "matter_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stage" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "closed_at" DATETIME,
    "archived_at" DATETIME
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client_type" TEXT NOT NULL,
    "contact_info" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "clients_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "material_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "material_type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "storage_uri" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "materials_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evidence_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "evidence_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "relevance" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "evidence_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "evidence_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials" ("material_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "material_id" TEXT,
    "evidence_id" TEXT,
    "argument_id" TEXT,
    "title" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "content_uri" TEXT,
    "content" TEXT,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "documents_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "documents_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials" ("material_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "documents_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence" ("evidence_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "documents_argument_id_fkey" FOREIGN KEY ("argument_id") REFERENCES "arguments" ("argument_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "document_drafts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matter_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source_argument_ids" TEXT NOT NULL,
    "source_fact_ids" TEXT NOT NULL,
    "source_issue_ids" TEXT NOT NULL,
    "source_law_ids" TEXT NOT NULL,
    "confidence" REAL,
    "ai_reasoning" TEXT,
    "review_status" TEXT NOT NULL DEFAULT 'generated',
    "lawyer_note" TEXT,
    "published_document_id" TEXT,
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "document_drafts_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "task_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "client_id" TEXT,
    "material_id" TEXT,
    "evidence_id" TEXT,
    "document_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "due_date" DATETIME,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tasks_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("client_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials" ("material_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence" ("evidence_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("document_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "timelines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timeline_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "task_id" TEXT,
    "document_id" TEXT,
    "material_id" TEXT,
    "evidence_id" TEXT,
    "ai_record_id" TEXT,
    "event_type" TEXT NOT NULL,
    "event_time" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "timelines_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "timelines_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks" ("task_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "timelines_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("document_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "timelines_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials" ("material_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "timelines_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence" ("evidence_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "timelines_ai_record_id_fkey" FOREIGN KEY ("ai_record_id") REFERENCES "ai_records" ("ai_record_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workflow_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_event_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "timeline_id" TEXT,
    "task_id" TEXT,
    "document_id" TEXT,
    "evidence_id" TEXT,
    "ai_record_id" TEXT,
    "event_type" TEXT NOT NULL,
    "event_time" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workflow_events_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "workflow_events_timeline_id_fkey" FOREIGN KEY ("timeline_id") REFERENCES "timelines" ("timeline_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "workflow_events_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks" ("task_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "workflow_events_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("document_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "workflow_events_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence" ("evidence_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "workflow_events_ai_record_id_fkey" FOREIGN KEY ("ai_record_id") REFERENCES "ai_records" ("ai_record_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ai_record_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "task_id" TEXT,
    "timeline_id" TEXT,
    "document_id" TEXT,
    "material_id" TEXT,
    "evidence_id" TEXT,
    "workflow_event_id" TEXT,
    "knowledge_id" TEXT,
    "ai_task_type" TEXT NOT NULL,
    "model" TEXT,
    "prompt_uri" TEXT,
    "result_uri" TEXT,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ai_records_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_records_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks" ("task_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_records_timeline_id_fkey" FOREIGN KEY ("timeline_id") REFERENCES "timelines" ("timeline_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_records_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("document_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_records_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials" ("material_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_records_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence" ("evidence_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_records_workflow_event_id_fkey" FOREIGN KEY ("workflow_event_id") REFERENCES "workflow_events" ("workflow_event_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_records_knowledge_id_fkey" FOREIGN KEY ("knowledge_id") REFERENCES "knowledge" ("knowledge_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "knowledge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "knowledge_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "document_id" TEXT,
    "material_id" TEXT,
    "evidence_id" TEXT,
    "task_id" TEXT,
    "timeline_id" TEXT,
    "workflow_event_id" TEXT,
    "ai_record_id" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content_uri" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "knowledge_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "knowledge_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("document_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "knowledge_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials" ("material_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "knowledge_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence" ("evidence_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "knowledge_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks" ("task_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "knowledge_timeline_id_fkey" FOREIGN KEY ("timeline_id") REFERENCES "timelines" ("timeline_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "knowledge_workflow_event_id_fkey" FOREIGN KEY ("workflow_event_id") REFERENCES "workflow_events" ("workflow_event_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "knowledge_ai_record_id_fkey" FOREIGN KEY ("ai_record_id") REFERENCES "ai_records" ("ai_record_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspace_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "task_id" TEXT,
    "timeline_id" TEXT,
    "document_id" TEXT,
    "material_id" TEXT,
    "evidence_id" TEXT,
    "workflow_event_id" TEXT,
    "ai_record_id" TEXT,
    "knowledge_id" TEXT,
    "layout" TEXT NOT NULL,
    "view_config" TEXT NOT NULL,
    "preferences" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workspaces_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "workspaces_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks" ("task_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "workspaces_timeline_id_fkey" FOREIGN KEY ("timeline_id") REFERENCES "timelines" ("timeline_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "workspaces_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("document_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "workspaces_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials" ("material_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "workspaces_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence" ("evidence_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "workspaces_workflow_event_id_fkey" FOREIGN KEY ("workflow_event_id") REFERENCES "workflow_events" ("workflow_event_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "workspaces_ai_record_id_fkey" FOREIGN KEY ("ai_record_id") REFERENCES "ai_records" ("ai_record_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "workspaces_knowledge_id_fkey" FOREIGN KEY ("knowledge_id") REFERENCES "knowledge" ("knowledge_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_enums" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enum_key" TEXT NOT NULL,
    "enum_value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "system_configurations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "config_key" TEXT NOT NULL,
    "config_value" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "system_dictionary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dict_type" TEXT NOT NULL,
    "dict_key" TEXT NOT NULL,
    "dict_value" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "execution_queue_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matter_id" TEXT NOT NULL,
    "queue_id" TEXT NOT NULL,
    "action_id" TEXT NOT NULL,
    "work_id" TEXT,
    "slot" TEXT NOT NULL,
    "execution_status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "facts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fact_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "facts_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fact_drafts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "draft_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "confidence" REAL,
    "ai_reasoning" TEXT,
    "source_evidence_ids" TEXT NOT NULL,
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "lawyer_note" TEXT,
    "published_fact_id" TEXT,
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "fact_drafts_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fact_evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fact_id" TEXT NOT NULL,
    "evidence_id" TEXT NOT NULL,
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fact_evidence_fact_id_fkey" FOREIGN KEY ("fact_id") REFERENCES "facts" ("fact_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fact_evidence_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence" ("evidence_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issue_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "issues_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "issue_drafts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matter_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "confidence" REAL,
    "ai_reasoning" TEXT,
    "source_fact_ids" TEXT NOT NULL,
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "lawyer_note" TEXT,
    "published_issue_id" TEXT,
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "issue_drafts_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "laws" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "law_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "issue_id" TEXT,
    "title" TEXT NOT NULL,
    "citation" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "laws_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "laws_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues" ("issue_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "law_drafts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matter_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "citation" TEXT,
    "rule_content" TEXT,
    "application" TEXT,
    "limitations" TEXT,
    "jurisdiction" TEXT,
    "source_reference" TEXT,
    "confidence" REAL,
    "ai_reasoning" TEXT,
    "source_issue_ids" TEXT NOT NULL,
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "lawyer_note" TEXT,
    "published_law_id" TEXT,
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "law_drafts_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "law_issue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "law_id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "law_issue_law_id_fkey" FOREIGN KEY ("law_id") REFERENCES "laws" ("law_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "law_issue_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues" ("issue_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "arguments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "argument_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "issue_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "conclusion" TEXT,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "arguments_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "arguments_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues" ("issue_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "argument_drafts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matter_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" TEXT,
    "reasoning" TEXT,
    "counter_argument" TEXT,
    "response" TEXT,
    "risk" TEXT,
    "conclusion" TEXT,
    "confidence" REAL,
    "ai_reasoning" TEXT,
    "source_fact_ids" TEXT NOT NULL,
    "source_issue_ids" TEXT NOT NULL,
    "source_law_ids" TEXT NOT NULL,
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "lawyer_note" TEXT,
    "published_argument_id" TEXT,
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "argument_drafts_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters" ("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "argument_fact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "argument_id" TEXT NOT NULL,
    "fact_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "argument_fact_argument_id_fkey" FOREIGN KEY ("argument_id") REFERENCES "arguments" ("argument_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "argument_fact_fact_id_fkey" FOREIGN KEY ("fact_id") REFERENCES "facts" ("fact_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "argument_issue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "argument_id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "argument_issue_argument_id_fkey" FOREIGN KEY ("argument_id") REFERENCES "arguments" ("argument_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "argument_issue_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues" ("issue_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "argument_law" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "argument_id" TEXT NOT NULL,
    "law_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "argument_law_argument_id_fkey" FOREIGN KEY ("argument_id") REFERENCES "arguments" ("argument_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "argument_law_law_id_fkey" FOREIGN KEY ("law_id") REFERENCES "laws" ("law_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "document_argument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "argument_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_argument_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("document_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "document_argument_argument_id_fkey" FOREIGN KEY ("argument_id") REFERENCES "arguments" ("argument_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "document_fact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "fact_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_fact_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("document_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "document_fact_fact_id_fkey" FOREIGN KEY ("fact_id") REFERENCES "facts" ("fact_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "document_issue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_issue_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("document_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "document_issue_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues" ("issue_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "document_law" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "law_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_law_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("document_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "document_law_law_id_fkey" FOREIGN KEY ("law_id") REFERENCES "laws" ("law_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "issue_fact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issue_id" TEXT NOT NULL,
    "fact_id" TEXT NOT NULL,
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "issue_fact_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues" ("issue_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "issue_fact_fact_id_fkey" FOREIGN KEY ("fact_id") REFERENCES "facts" ("fact_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "matters_matter_id_key" ON "matters"("matter_id");

-- CreateIndex
CREATE UNIQUE INDEX "clients_client_id_key" ON "clients"("client_id");

-- CreateIndex
CREATE INDEX "idx_clients_matter_id" ON "clients"("matter_id");

-- CreateIndex
CREATE UNIQUE INDEX "materials_material_id_key" ON "materials"("material_id");

-- CreateIndex
CREATE INDEX "idx_materials_matter_id" ON "materials"("matter_id");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_evidence_id_key" ON "evidence"("evidence_id");

-- CreateIndex
CREATE INDEX "idx_evidence_matter_id" ON "evidence"("matter_id");

-- CreateIndex
CREATE INDEX "idx_evidence_material_id" ON "evidence"("material_id");

-- CreateIndex
CREATE UNIQUE INDEX "documents_document_id_key" ON "documents"("document_id");

-- CreateIndex
CREATE INDEX "idx_documents_matter_id" ON "documents"("matter_id");

-- CreateIndex
CREATE INDEX "idx_documents_material_id" ON "documents"("material_id");

-- CreateIndex
CREATE INDEX "idx_documents_evidence_id" ON "documents"("evidence_id");

-- CreateIndex
CREATE INDEX "idx_documents_argument_id" ON "documents"("argument_id");

-- CreateIndex
CREATE INDEX "idx_document_drafts_matter_id" ON "document_drafts"("matter_id");

-- CreateIndex
CREATE INDEX "idx_document_drafts_matter_type" ON "document_drafts"("matter_id", "document_type");

-- CreateIndex
CREATE INDEX "idx_document_drafts_matter_review_status" ON "document_drafts"("matter_id", "review_status");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_task_id_key" ON "tasks"("task_id");

-- CreateIndex
CREATE INDEX "idx_tasks_matter_id_status" ON "tasks"("matter_id", "status");

-- CreateIndex
CREATE INDEX "idx_tasks_client_id" ON "tasks"("client_id");

-- CreateIndex
CREATE INDEX "idx_tasks_material_id" ON "tasks"("material_id");

-- CreateIndex
CREATE INDEX "idx_tasks_evidence_id" ON "tasks"("evidence_id");

-- CreateIndex
CREATE INDEX "idx_tasks_document_id" ON "tasks"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "timelines_timeline_id_key" ON "timelines"("timeline_id");

-- CreateIndex
CREATE INDEX "idx_timelines_matter_id_event_time" ON "timelines"("matter_id", "event_time");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_events_workflow_event_id_key" ON "workflow_events"("workflow_event_id");

-- CreateIndex
CREATE INDEX "idx_workflow_events_matter_id" ON "workflow_events"("matter_id");

-- CreateIndex
CREATE INDEX "idx_workflow_events_workflow_id_event_time" ON "workflow_events"("workflow_id", "event_time");

-- CreateIndex
CREATE UNIQUE INDEX "ai_records_ai_record_id_key" ON "ai_records"("ai_record_id");

-- CreateIndex
CREATE INDEX "idx_ai_records_matter_id_created_at" ON "ai_records"("matter_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_knowledge_id_key" ON "knowledge"("knowledge_id");

-- CreateIndex
CREATE INDEX "idx_knowledge_matter_id" ON "knowledge"("matter_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_workspace_id_key" ON "workspaces"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_workspaces_matter_id" ON "workspaces"("matter_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_system_enums_enum_key_enum_value" ON "system_enums"("enum_key", "enum_value");

-- CreateIndex
CREATE UNIQUE INDEX "system_configurations_config_key_key" ON "system_configurations"("config_key");

-- CreateIndex
CREATE UNIQUE INDEX "uq_system_dictionary_type_key" ON "system_dictionary"("dict_type", "dict_key");

-- CreateIndex
CREATE UNIQUE INDEX "uq_execution_queue_item_matter_queue" ON "execution_queue_item"("matter_id", "queue_id");

-- CreateIndex
CREATE UNIQUE INDEX "facts_fact_id_key" ON "facts"("fact_id");

-- CreateIndex
CREATE INDEX "idx_facts_matter_id" ON "facts"("matter_id");

-- CreateIndex
CREATE UNIQUE INDEX "fact_drafts_draft_id_key" ON "fact_drafts"("draft_id");

-- CreateIndex
CREATE INDEX "idx_fact_drafts_matter_id" ON "fact_drafts"("matter_id");

-- CreateIndex
CREATE INDEX "idx_fact_drafts_matter_review_status" ON "fact_drafts"("matter_id", "review_status");

-- CreateIndex
CREATE INDEX "idx_fact_evidence_fact_id" ON "fact_evidence"("fact_id");

-- CreateIndex
CREATE INDEX "idx_fact_evidence_evidence_id" ON "fact_evidence"("evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_fact_evidence_fact_evidence" ON "fact_evidence"("fact_id", "evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "issues_issue_id_key" ON "issues"("issue_id");

-- CreateIndex
CREATE INDEX "idx_issues_matter_id" ON "issues"("matter_id");

-- CreateIndex
CREATE INDEX "idx_issue_drafts_matter_id" ON "issue_drafts"("matter_id");

-- CreateIndex
CREATE INDEX "idx_issue_drafts_matter_review_status" ON "issue_drafts"("matter_id", "review_status");

-- CreateIndex
CREATE UNIQUE INDEX "laws_law_id_key" ON "laws"("law_id");

-- CreateIndex
CREATE INDEX "idx_laws_matter_id" ON "laws"("matter_id");

-- CreateIndex
CREATE INDEX "idx_laws_issue_id" ON "laws"("issue_id");

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

-- CreateIndex
CREATE UNIQUE INDEX "arguments_argument_id_key" ON "arguments"("argument_id");

-- CreateIndex
CREATE INDEX "idx_arguments_matter_id" ON "arguments"("matter_id");

-- CreateIndex
CREATE INDEX "idx_arguments_issue_id" ON "arguments"("issue_id");

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

-- CreateIndex
CREATE INDEX "idx_document_argument_document_id" ON "document_argument"("document_id");

-- CreateIndex
CREATE INDEX "idx_document_argument_argument_id" ON "document_argument"("argument_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_document_argument_document_argument" ON "document_argument"("document_id", "argument_id");

-- CreateIndex
CREATE INDEX "idx_document_fact_document_id" ON "document_fact"("document_id");

-- CreateIndex
CREATE INDEX "idx_document_fact_fact_id" ON "document_fact"("fact_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_document_fact_document_fact" ON "document_fact"("document_id", "fact_id");

-- CreateIndex
CREATE INDEX "idx_document_issue_document_id" ON "document_issue"("document_id");

-- CreateIndex
CREATE INDEX "idx_document_issue_issue_id" ON "document_issue"("issue_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_document_issue_document_issue" ON "document_issue"("document_id", "issue_id");

-- CreateIndex
CREATE INDEX "idx_document_law_document_id" ON "document_law"("document_id");

-- CreateIndex
CREATE INDEX "idx_document_law_law_id" ON "document_law"("law_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_document_law_document_law" ON "document_law"("document_id", "law_id");

-- CreateIndex
CREATE INDEX "idx_issue_fact_issue_id" ON "issue_fact"("issue_id");

-- CreateIndex
CREATE INDEX "idx_issue_fact_fact_id" ON "issue_fact"("fact_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_issue_fact_issue_fact" ON "issue_fact"("issue_id", "fact_id");
