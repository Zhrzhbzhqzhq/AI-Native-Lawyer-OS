/*
  Warnings:

  - A unique constraint covering the columns `[matter_id,queue_id]` on the table `execution_queue_item` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "execution_queue_item_queue_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "uq_execution_queue_item_matter_queue" ON "execution_queue_item"("matter_id", "queue_id");
