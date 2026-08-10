-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "site_address" TEXT;

-- AlterTable
ALTER TABLE "quote_alternatives" ADD COLUMN     "description" TEXT,
ADD COLUMN     "issued_date" TIMESTAMP(3),
ADD COLUMN     "valid_until" TIMESTAMP(3),
ADD COLUMN     "warranty_years" INTEGER;
