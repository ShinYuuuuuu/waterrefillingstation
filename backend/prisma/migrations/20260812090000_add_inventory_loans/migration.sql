CREATE TYPE "InventoryLoanStatus" AS ENUM ('OUTSTANDING', 'RETURNED', 'SOLD');

CREATE TABLE "inventory_loans" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "sale_id" TEXT,
  "quantity" INTEGER NOT NULL,
  "status" "InventoryLoanStatus" NOT NULL DEFAULT 'OUTSTANDING',
  "notes" TEXT,
  "lent_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(6),
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_loans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_loans_tenant_id_branch_id_status_idx" ON "inventory_loans"("tenant_id", "branch_id", "status");
CREATE INDEX "inventory_loans_customer_id_status_idx" ON "inventory_loans"("customer_id", "status");
CREATE INDEX "inventory_loans_product_id_status_idx" ON "inventory_loans"("product_id", "status");
ALTER TABLE "inventory_loans" ADD CONSTRAINT "inventory_loans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_loans" ADD CONSTRAINT "inventory_loans_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_loans" ADD CONSTRAINT "inventory_loans_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_loans" ADD CONSTRAINT "inventory_loans_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_loans" ADD CONSTRAINT "inventory_loans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
