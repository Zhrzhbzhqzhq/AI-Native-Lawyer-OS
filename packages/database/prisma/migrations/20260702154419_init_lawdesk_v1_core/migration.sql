-- CreateTable
CREATE TABLE "matters" (
    "id" UUID NOT NULL,
    "matter_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "matter_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "matters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "client_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client_type" TEXT NOT NULL,
    "contact_info" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" UUID NOT NULL,
    "material_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "material_type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "storage_uri" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" UUID NOT NULL,
    "evidence_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "evidence_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "relevance" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "document_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "material_id" TEXT,
    "evidence_id" TEXT,
    "title" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "content_uri" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "task_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "client_id" TEXT,
    "material_id" TEXT,
    "evidence_id" TEXT,
    "document_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "due_date" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timelines" (
    "id" UUID NOT NULL,
    "timeline_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "task_id" TEXT,
    "document_id" TEXT,
    "material_id" TEXT,
    "evidence_id" TEXT,
    "ai_record_id" TEXT,
    "event_type" TEXT NOT NULL,
    "event_time" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_events" (
    "id" UUID NOT NULL,
    "workflow_event_id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "timeline_id" TEXT,
    "task_id" TEXT,
    "document_id" TEXT,
    "evidence_id" TEXT,
    "ai_record_id" TEXT,
    "event_type" TEXT NOT NULL,
    "event_time" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_records" (
    "id" UUID NOT NULL,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge" (
    "id" UUID NOT NULL,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
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
    "layout" JSONB NOT NULL,
    "view_config" JSONB NOT NULL,
    "preferences" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_enums" (
    "id" UUID NOT NULL,
    "enum_key" TEXT NOT NULL,
    "enum_value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_enums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configurations" (
    "id" UUID NOT NULL,
    "config_key" TEXT NOT NULL,
    "config_value" JSONB NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_dictionary" (
    "id" UUID NOT NULL,
    "dict_type" TEXT NOT NULL,
    "dict_key" TEXT NOT NULL,
    "dict_value" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_dictionary_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("material_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("material_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("evidence_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("client_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("material_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("evidence_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("material_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("evidence_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_ai_record_id_fkey" FOREIGN KEY ("ai_record_id") REFERENCES "ai_records"("ai_record_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_timeline_id_fkey" FOREIGN KEY ("timeline_id") REFERENCES "timelines"("timeline_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("evidence_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_ai_record_id_fkey" FOREIGN KEY ("ai_record_id") REFERENCES "ai_records"("ai_record_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_records" ADD CONSTRAINT "ai_records_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_records" ADD CONSTRAINT "ai_records_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_records" ADD CONSTRAINT "ai_records_timeline_id_fkey" FOREIGN KEY ("timeline_id") REFERENCES "timelines"("timeline_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_records" ADD CONSTRAINT "ai_records_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_records" ADD CONSTRAINT "ai_records_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("material_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_records" ADD CONSTRAINT "ai_records_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("evidence_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_records" ADD CONSTRAINT "ai_records_workflow_event_id_fkey" FOREIGN KEY ("workflow_event_id") REFERENCES "workflow_events"("workflow_event_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_records" ADD CONSTRAINT "ai_records_knowledge_id_fkey" FOREIGN KEY ("knowledge_id") REFERENCES "knowledge"("knowledge_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("material_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("evidence_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_timeline_id_fkey" FOREIGN KEY ("timeline_id") REFERENCES "timelines"("timeline_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_workflow_event_id_fkey" FOREIGN KEY ("workflow_event_id") REFERENCES "workflow_events"("workflow_event_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_ai_record_id_fkey" FOREIGN KEY ("ai_record_id") REFERENCES "ai_records"("ai_record_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("matter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_timeline_id_fkey" FOREIGN KEY ("timeline_id") REFERENCES "timelines"("timeline_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("material_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("evidence_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_workflow_event_id_fkey" FOREIGN KEY ("workflow_event_id") REFERENCES "workflow_events"("workflow_event_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_ai_record_id_fkey" FOREIGN KEY ("ai_record_id") REFERENCES "ai_records"("ai_record_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_knowledge_id_fkey" FOREIGN KEY ("knowledge_id") REFERENCES "knowledge"("knowledge_id") ON DELETE RESTRICT ON UPDATE CASCADE;
