-- AlterTable
ALTER TABLE "material_compositions" ADD COLUMN     "featured_product_id" TEXT;

-- AddForeignKey
ALTER TABLE "material_compositions" ADD CONSTRAINT "material_compositions_featured_product_id_fkey" FOREIGN KEY ("featured_product_id") REFERENCES "material_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
