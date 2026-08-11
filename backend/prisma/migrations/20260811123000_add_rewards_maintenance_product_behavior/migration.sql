ALTER TABLE "products" ADD COLUMN "is_for_sale" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "customers"
  ADD COLUMN "reward_purchase_progress" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reward_gallon_progress" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "free_gallons_balance" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "sales_transactions" ADD COLUMN "reward_gallons_redeemed" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "maintenance_schedules" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "trigger_type" TEXT NOT NULL,
  "gallon_interval" INTEGER,
  "day_interval" INTEGER,
  "baseline_gallons" INTEGER NOT NULL DEFAULT 0,
  "last_completed_at" TIMESTAMP(6),
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maintenance_completions" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "schedule_id" TEXT NOT NULL,
  "performed_by" TEXT NOT NULL,
  "performed_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "gallon_count_at_completion" INTEGER NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "maintenance_completions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "maintenance_schedules_tenant_id_branch_id_is_active_idx" ON "maintenance_schedules"("tenant_id", "branch_id", "is_active");
CREATE INDEX "maintenance_completions_schedule_id_performed_at_idx" ON "maintenance_completions"("schedule_id", "performed_at");
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_completions" ADD CONSTRAINT "maintenance_completions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_completions" ADD CONSTRAINT "maintenance_completions_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "maintenance_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
