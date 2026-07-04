-- CreateTable
CREATE TABLE "execution_queue_item" (
    "id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "queue_id" TEXT NOT NULL,
    "action_id" TEXT NOT NULL,
    "work_id" TEXT,
    "slot" TEXT NOT NULL,
    "execution_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "execution_queue_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "execution_queue_item_queue_id_key" ON "execution_queue_item"("queue_id");
