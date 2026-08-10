-- AlterTable
ALTER TABLE "technical_solution_items" DROP COLUMN "value_text",
ADD COLUMN     "value_number" DECIMAL(10,2);

