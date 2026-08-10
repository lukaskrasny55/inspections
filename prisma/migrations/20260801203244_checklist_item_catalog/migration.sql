-- CreateEnum
CREATE TYPE "ChecklistItemCategory" AS ENUM ('material', 'prace', 'ine');

-- CreateEnum
CREATE TYPE "ChecklistItemSource" AS ENUM ('system_default', 'custom_added');

-- DropIndex
DROP INDEX "technical_solution_items_inspection_id_item_key_key";

-- AlterTable
ALTER TABLE "technical_solution_items" DROP COLUMN "item_key",
ADD COLUMN     "catalog_item_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "checklist_item_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "default_unit_price" DECIMAL(10,2) NOT NULL,
    "category" "ChecklistItemCategory" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "source" "ChecklistItemSource" NOT NULL DEFAULT 'custom_added',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_item_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "technical_solution_items_inspection_id_catalog_item_id_key" ON "technical_solution_items"("inspection_id", "catalog_item_id");

-- AddForeignKey
ALTER TABLE "technical_solution_items" ADD CONSTRAINT "technical_solution_items_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "checklist_item_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

