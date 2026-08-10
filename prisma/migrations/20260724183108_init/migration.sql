-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('draft', 'ready_for_quote', 'sent', 'archived');

-- CreateEnum
CREATE TYPE "PriceCategory" AS ENUM ('material', 'prace');

-- CreateEnum
CREATE TYPE "LineItemSection" AS ENUM ('main', 'nad_ramec');

-- CreateEnum
CREATE TYPE "LineItemSource" AS ENUM ('auto_calculated', 'manual');

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "building_admin" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_inquiries" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "message" TEXT,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technicians" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "technician_id" TEXT,
    "web_inquiry_id" TEXT,
    "reference_number" TEXT NOT NULL,
    "inspection_date" TIMESTAMP(3),
    "area_m2" DECIMAL(10,2),
    "current_state_description" TEXT,
    "is_insulated" BOOLEAN,
    "status" "InspectionStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roof_edges" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "length_m" DECIMAL(10,2) NOT NULL,
    "atika_height_cm" DECIMAL(10,2),
    "sequence_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "roof_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roof_area_sections" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "width_m" DECIMAL(10,2) NOT NULL,
    "height_m" DECIMAL(10,2) NOT NULL,
    "area_m2" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "roof_area_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_photos" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_sketch" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "file_url" TEXT,
    "sketch_json" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_sketch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_solution_items" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "item_key" TEXT NOT NULL,
    "is_checked" BOOLEAN NOT NULL DEFAULT false,
    "value_text" TEXT,
    "notes" TEXT,

    CONSTRAINT "technical_solution_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drain_downspouts" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "length_m" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "drain_downspouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gutter_system_items" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "gutter_system_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "additional_services" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photo_url" TEXT,

    CONSTRAINT "additional_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_compositions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layers_json" JSONB NOT NULL,
    "work_steps_template" TEXT,
    "warranty_years" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_compositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list" (
    "id" TEXT NOT NULL,
    "item_key" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "category" "PriceCategory" NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL,
    "ico" TEXT,
    "dic" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "address" TEXT,
    "logo_url" TEXT,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_alternatives" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "material_composition_id" TEXT,
    "label" TEXT NOT NULL,
    "total_price" DECIMAL(10,2),
    "document_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_alternatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_line_items" (
    "id" TEXT NOT NULL,
    "quote_alternative_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "planned_qty" DECIMAL(10,2),
    "previous_qty" DECIMAL(10,2),
    "actual_qty" DECIMAL(10,2),
    "waste_percent" DECIMAL(5,2),
    "unit_price_snapshot" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "section" "LineItemSection" NOT NULL DEFAULT 'main',
    "source" "LineItemSource" NOT NULL DEFAULT 'auto_calculated',
    "sequence_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quote_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "technicians_email_key" ON "technicians"("email");

-- CreateIndex
CREATE UNIQUE INDEX "inspections_web_inquiry_id_key" ON "inspections"("web_inquiry_id");

-- CreateIndex
CREATE UNIQUE INDEX "inspections_reference_number_key" ON "inspections"("reference_number");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_sketch_inspection_id_key" ON "inspection_sketch"("inspection_id");

-- CreateIndex
CREATE UNIQUE INDEX "technical_solution_items_inspection_id_item_key_key" ON "technical_solution_items"("inspection_id", "item_key");

-- CreateIndex
CREATE UNIQUE INDEX "quote_alternatives_inspection_id_label_key" ON "quote_alternatives"("inspection_id", "label");

-- CreateIndex
CREATE UNIQUE INDEX "document_templates_key_key" ON "document_templates"("key");

-- AddForeignKey
ALTER TABLE "web_inquiries" ADD CONSTRAINT "web_inquiries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_web_inquiry_id_fkey" FOREIGN KEY ("web_inquiry_id") REFERENCES "web_inquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roof_edges" ADD CONSTRAINT "roof_edges_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roof_area_sections" ADD CONSTRAINT "roof_area_sections_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_photos" ADD CONSTRAINT "inspection_photos_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_sketch" ADD CONSTRAINT "inspection_sketch_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_solution_items" ADD CONSTRAINT "technical_solution_items_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drain_downspouts" ADD CONSTRAINT "drain_downspouts_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gutter_system_items" ADD CONSTRAINT "gutter_system_items_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "additional_services" ADD CONSTRAINT "additional_services_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_alternatives" ADD CONSTRAINT "quote_alternatives_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_alternatives" ADD CONSTRAINT "quote_alternatives_material_composition_id_fkey" FOREIGN KEY ("material_composition_id") REFERENCES "material_compositions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_quote_alternative_id_fkey" FOREIGN KEY ("quote_alternative_id") REFERENCES "quote_alternatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
