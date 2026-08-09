-- CreateEnum
CREATE TYPE "InventoryUpdateRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RESOLVED');

-- CreateTable
CREATE TABLE "inventory_update_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "previous_quantity" INTEGER NOT NULL,
    "requested_quantity" INTEGER NOT NULL,
    "approved_quantity" INTEGER,
    "notes" TEXT,
    "status" "InventoryUpdateRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "inventory_update_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_update_requests_tenant_id_branch_id_product_id_idx" ON "inventory_update_requests"("tenant_id", "branch_id", "product_id");

-- CreateIndex
CREATE INDEX "inventory_update_requests_status_idx" ON "inventory_update_requests"("status");

-- AddForeignKey
ALTER TABLE "inventory_update_requests" ADD CONSTRAINT "inventory_update_requests_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_update_requests" ADD CONSTRAINT "inventory_update_requests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_update_requests" ADD CONSTRAINT "inventory_update_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
