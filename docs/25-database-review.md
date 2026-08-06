# 25. Database Review

**Review Date:** 2026-08-03  
**Reviewer:** Senior Backend Architect  
**Subject:** Prisma Schema + Database Design Review (pre-implementation)  
**Scope:** `backend/prisma/schema.prisma`, `docs/07-database-design.md`, `docs/08-erd.md`

---

## Executive Summary

The database design is **architecturally sound** and covers the complete gallon lifecycle, multi-tenant isolation, RBAC, financial integrity, and delivery/sales/customer workflows. The schema is production-ready in structure but has **3 critical gaps** that must be resolved before backend implementation begins.

| Category | Status | Score |
|---|---|---|
| Prisma Schema Consistency | ✅ Pass | 9/10 |
| Relation Correctness | ✅ Pass | 9/10 |
| Missing Indexes | ⚠️ Warning | 7/10 |
| Missing Unique Constraints | ⚠️ Warning | 8/10 |
| Naming Consistency | ✅ Pass | 9/10 |
| Enum Consistency | ⚠️ Warning | 8/10 |
| Soft Delete Readiness | ❌ Fail | 2/10 |
| Multi-Tenant Isolation | ⚠️ Warning | 7/10 |
| RBAC Readiness | ✅ Pass | 10/10 |
| Gallon Lifecycle Support | ✅ Pass | 10/10 |
| Financial Transaction Integrity | ✅ Pass | 10/10 |

**Overall Migration Readiness Score: 7.5/10**

---

## 1. Approved Decisions

### 1.1 Schema Architecture
- **48 models** organized into 13 logical domains (Core, Audit, Products, Gallons, Customers, Resellers, Sales, Delivery, Financial, Supply, Notifications, Reports, Equipment).
- **22 enums** provide type-safe state management across all business domains.
- **UUID primary keys** on all models for global uniqueness and offline-first sync compatibility.
- **DECIMAL(12,2)** for all monetary values — correct choice for financial precision.
- **TIMESTAMPTZ** (`@db.Timestamp`) used consistently for all datetime columns.
- **JSONB** used appropriately for flexible metadata (`business_hours`, `purification_stages`, `payload`, `metadata`).
- **Composite unique constraints** correctly enforce business rules (e.g., `[branch_id, invoice_number]` on sales transactions, `[tenant_id, sku]` on products).
- **Idempotency key** on `SalesTransaction` supports offline-first sync deduplication.
- **Gallon lifecycle tracking** via dedicated models (`GallonStatusHistory`, `GallonCleaningRecord`, `GallonInspection`, `GallonFillLog`) is well-designed and fully auditable.
- **Polymorphic holder pattern** (`current_holder_type/current_holder_id`) is correctly implemented at the application layer with enum validation.

### 1.2 Indexing Strategy
- Foreign key columns are indexed in most cases.
- Composite indexes on common query patterns: `[tenant_id, branch_id, product_id]` on `InventoryLedger`, `[tenant_id, branch_id, created_at]` on `SalesTransaction`, `[customer_id, created_at]` on `CustomerLedger`.
- Covering indexes for reporting: `[due_date, is_paid]` on `CustomerLedger` for aging reports.

### 1.3 RBAC Design
- `UserRoleAssignment` with optional `branch_id` scoping enables both global (Owner) and branch-local (Cashier) roles.
- `RolePermission` junction table enables granular permission assignment.
- `Permission.code` is globally unique, enabling clean permission checks in application code.

---

## 2. Required Fixes

### CRITICAL — Fix before migration

#### FIX-01: Missing `deleted_at` (Soft Delete) on ALL Models

**Problem:** The database design document (`07-database-design.md`) explicitly states: "All transactional tables use soft deletes (`deleted_at`)." However, **no model in the Prisma schema has a `deleted_at` column**. This means:
- Hard deletes will be possible on financial and inventory records.
- Audit trail integrity is compromised.
- Compliance with NFR-COMP-03 (10-year data retention) is impossible.

**Impact:** High — affects every model, especially financial and inventory records.

**Required change (per-model example):**
```prisma
model SalesTransaction {
  id                  String    @id @default(uuid())
  // ... existing fields ...
  deleted_at          DateTime? @db.Timestamp  // ADD THIS
  
  @@index([tenant_id, branch_id, deleted_at])
}
```

**Models requiring `deleted_at`:** All 48 models.

**Models requiring composite index update:** All models that query by `tenant_id` + `branch_id` should add `deleted_at` to the index to exclude soft-deleted rows efficiently.

---

#### FIX-02: Missing `tenant_id` on 9 Models

**Problem:** Multi-tenant isolation is incomplete. The following models lack `tenant_id`, making it impossible to enforce tenant scoping at the database level:

| Model | Missing Column | Impact |
|---|---|---|
| `UserRoleAssignment` | `tenant_id` | Role assignments leak across tenants |
| `RolePermission` | `tenant_id` | Permissions leak across tenants |
| `RefreshToken` | `tenant_id` | Tokens leak across tenants |
| `GallonStatusHistory` | `tenant_id` | Gallon history leaks across tenants |
| `GallonInspection` | `tenant_id` | Inspection records leak across tenants |
| `GallonFillLog` | `tenant_id` | Fill logs leak across tenants |
| `DeliveryProof` | `tenant_id` | Proof records leak across tenants |
| `Installment` | `tenant_id` | Installments leak across tenants |
| `NotificationPreference` | `tenant_id` | Preferences leak across tenants |

**Required change (example):**
```prisma
model UserRoleAssignment {
  id          String    @id @default(uuid())
  tenant_id   String    // ADD THIS
  user_id     String
  // ...
  
  @@index([tenant_id])
}
```

---

#### FIX-03: `ContainerMovement.movement_type` Uses String Instead of Enum

**Problem:** `ContainerMovement.movement_type` is typed as `String`, while the equivalent `InventoryLedger.movement_type` correctly uses the `MovementType` enum. This creates:
- Inconsistent query patterns.
- Risk of invalid movement type values entering the database.
- Missed compile-time safety.

**Required change:**
```prisma
model ContainerMovement {
  // ...
  movement_type   MovementType  // Change from String to MovementType
  // ...
}
```

---

## 3. Recommended Improvements

### HIGH Priority

#### IMP-01: Missing Indexes on Foreign Keys

The following foreign key columns are **not indexed**, which will cause performance degradation on common queries:

| Model | Column | Reason |
|---|---|---|
| `SalesTransaction` | `shift_id` | Shift reports, daily Z-reading |
| `DeliveryOrder` | `address_id` | Delivery lookups by address |
| `Payment` | `collected_by` | Cashier payment reports |
| `ContainerDeposit` | `product_id` | Deposit reports by container type |
| `ContainerDeposit` | `gallon_id` | Deposit tracking per gallon |
| `SalesTransactionItem` | `container_id` | Container exchange tracking |
| `StockTransferItem` | `container_id` | Transfer tracking per container |
| `GallonFillLog` | `production_batch_id` | Production batch reporting |
| `DeliveryOrder` | `standing_order_id` | Standing order fulfillment queries |
| `ProductionBatch` | `operator_id` | Operator production reports |

**Recommended additions:**
```prisma
@@index([shift_id])                    // SalesTransaction
@@index([address_id])                  // DeliveryOrder
@@index([collected_by])                // Payment
@@index([product_id])                  // ContainerDeposit
@@index([gallon_id])                   // ContainerDeposit
@@index([container_id])                // SalesTransactionItem
@@index([container_id])                // StockTransferItem
@@index([production_batch_id])         // GallonFillLog
@@index([standing_order_id])           // DeliveryOrder
@@index([operator_id])                 // ProductionBatch
```

---

#### IMP-02: Missing `updated_by` Audit Columns

The design document specifies `created_by` and `updated_by` on all tables. Many models have `created_by` but lack `updated_by`:

| Model | Has `created_by` | Missing `updated_by` |
|---|---|---|
| `Tenant` | ✅ | ❌ |
| `Branch` | ✅ | ❌ |
| `User` | ✅ | ❌ |
| `Role` | ❌ | ❌ |
| `Permission` | ❌ | ❌ |
| `ProductCategory` | ❌ | ❌ |
| `Product` | ✅ | ❌ |
| `BranchInventory` | ❌ | ❌ |
| `GallonType` | ❌ | ❌ |
| `Gallon` | ❌ | ❌ |
| `Customer` | ✅ | ❌ |
| `Setting` | ✅ | ✅ (has `updated_by`) |
| `Backup` | ❌ | ❌ |
| `Integration` | ❌ | ❌ |
| `Supplier` | ❌ | ❌ |
| `Purchase` | ✅ | ❌ |
| `StockTransfer` | ❌ | ❌ |
| `StockCountSession` | ❌ | ❌ |
| `Reseller` | ❌ | ❌ |
| `ResellerConsignment` | ❌ | ❌ |
| `Shift` | ❌ | ❌ |
| `SalesTransaction` | ✅ | ❌ |
| `Discount` | ❌ | ❌ |
| `Promotion` | ❌ | ❌ |
| `DeliveryOrder` | ❌ | ❌ |
| `StandingOrder` | ❌ | ❌ |
| `DeliveryRoute` | ❌ | ❌ |
| `RiderShift` | ❌ | ❌ |
| `Payment` | ❌ | ❌ |
| `CustomerStatement` | ❌ | ❌ |
| `CustomerLedger` | ✅ | ❌ |
| `InstallmentPlan` | ✅ | ❌ |
| `ContainerDeposit` | ❌ | ❌ |
| `Refund` | ✅ | ❌ |
| `CashTransaction` | ❌ | ❌ |
| `Expense` | ✅ | ❌ |
| `BankStatement` | ❌ | ❌ |
| `Equipment` | ❌ | ❌ |
| `NotificationTemplate` | ❌ | ❌ |
| `ReportSchedule` | ✅ | ❌ |
| `ExportJob` | ❌ | ❌ |

---

#### IMP-03: Additional Unique Constraints

| Model | Suggested Constraint | Reason |
|---|---|---|
| `ResellerConsignment` | `@@unique([reseller_id, product_id])` | Prevent duplicate consignment records for same product |
| `CustomerStatement` | `@@unique([customer_id, period_start, period_end])` | Prevent duplicate statements for same period |
| `ProductionBatch` | Already has `@@unique([tenant_id, batch_number])` ✅ | — |
| `SalesTransaction` | Already has `@@unique([branch_id, invoice_number])` ✅ | — |

---

### MEDIUM Priority

#### IMP-04: Database-Level CHECK Constraints

Per `AI_PROJECT_RULES.md` Section 4.2: "Use `CHECK` constraints for valid ranges and enumerations."

Recommended constraints (applied via raw SQL migrations, as Prisma doesn't support CHECK constraints directly):

```sql
-- Prevent negative inventory (unless explicitly overridden)
ALTER TABLE branch_inventory ADD CONSTRAINT non_negative_quantity CHECK (quantity_on_hand >= 0);

-- Prevent negative credit balance (if business rule requires)
-- ALTER TABLE customers ADD CONSTRAINT non_negative_balance CHECK (current_balance >= 0);

-- Ensure grand_total = subtotal + tax_total - discount_total
-- ALTER TABLE sales_transactions ADD CONSTRAINT valid_grand_total 
--   CHECK (grand_total >= 0);

-- Ensure payment amount is positive
ALTER TABLE payments ADD CONSTRAINT positive_payment CHECK (amount > 0);

-- Ensure invoice_number is not empty
ALTER TABLE sales_transactions ADD CONSTRAINT non_empty_invoice CHECK (invoice_number <> '');
```

---

#### IMP-05: `Customer.current_balance` Synchronization

**Risk:** `Customer.current_balance` is a denormalized column that must stay in sync with `CustomerLedger`. If they drift, financial reports will be incorrect.

**Recommendation:**
- Add a database trigger or scheduled job to recalculate `current_balance` from `CustomerLedger` periodically.
- Add a `balance_last_recalculated_at` column to `Customer` to track when the balance was last verified.
- In application code, always wrap `CustomerLedger` insert + `Customer.current_balance` update in a transaction.

---

#### IMP-06: `Setting.value` Type Safety

**Problem:** `Setting.value` is `Json`, which allows any structure. Different settings have different schemas (`tax_rate` has `{rate, inclusive}`, `container_deposit_default` has `{amount, currency}`).

**Recommendation:** Add a `value_schema` column (JSON Schema string) to validate `value` at the application level, or create separate setting models for structured settings.

---

### LOW Priority

#### IMP-07: `NotificationPreference` Unique Constraint Too Strict

**Problem:** `@@unique([user_id, customer_id, template_code, channel])` requires both `user_id` AND `customer_id` to be non-null for uniqueness. Since `user_id` and `customer_id` are mutually exclusive (internal staff vs. external customers), this constraint may not work as intended.

**Recommendation:** Use a partial unique index or separate models for staff and customer preferences:
```sql
CREATE UNIQUE INDEX unique_staff_prefs ON notification_preferences (user_id, template_code, channel) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX unique_customer_prefs ON notification_preferences (customer_id, template_code, channel) WHERE customer_id IS NOT NULL;
```

---

#### IMP-08: `Gallon.serial_number` Unique Constraint on Nullable Field

**Problem:** `serial_number` has `@unique`, but it's nullable. In PostgreSQL, multiple rows with `NULL` are allowed even with a UNIQUE constraint. This is fine, but if business rules require every gallon to have a serial number, make it non-nullable.

**Recommendation:** If serial numbers are mandatory, change to `serial_number String @unique` (remove `?`).

---

## 4. Specific Business Question Verification

### Q1: Can every gallon movement be audited?

**Answer: YES — with the fix for FIX-02.**

The following models provide complete audit coverage:
- `GallonStatusHistory` — every status transition (purchased → in_stock → cleaning → filled → with_customer → returned → cleaning → in_stock).
- `GallonCleaningRecord` — every cleaning event with type, detergents, pH level, pass/fail.
- `GallonInspection` — every inspection with condition, cracks, stains, odor, seal, grade.
- `GallonFillLog` — every fill event with volume, source, purification stages, quality checks, pH/TDS.
- `ContainerMovement` — every custody transfer (branch ↔ customer ↔ rider ↔ reseller).

**Gap:** `GallonStatusHistory`, `GallonInspection`, and `GallonFillLog` are missing `tenant_id` (FIX-02), which prevents cross-tenant audit isolation.

---

### Q2: Can customer credit balances be calculated?

**Answer: YES.**

- `CustomerLedger` tracks every transaction with `amount`, `running_balance`, `entry_type`, `reference_type`, `reference_id`, `due_date`, `is_paid`.
- `Customer.current_balance` provides a cached denormalized balance.
- `CustomerStatement` provides periodic snapshots with `opening_balance`, `charges_total`, `payments_total`, `closing_balance`.
- `InstallmentPlan` + `Installment` track installment schedules.
- `Payment` tracks all payment events with `status` for reconciliation.

**Gap:** `Customer.current_balance` can drift from the sum of `CustomerLedger` entries. See IMP-05.

---

### Q3: Can sales connect correctly to payments?

**Answer: YES.**

- `SalesTransaction` → `Payment` (1:N) via `sales_transaction_id` supports split payments.
- `Payment` has optional `customer_id` for on-account payments not tied to a single sale.
- `Payment.status` tracks the full lifecycle: `PENDING` → `CONFIRMED` → `RECONCILED`.
- `Payment.collected_by` links to the User who collected it.
- `ReconciliationEntry` links `Payment` → `BankStatement` for reconciliation.

---

### Q4: Can deliveries connect correctly to customers and inventory?

**Answer: YES, with minor gaps.**

- `DeliveryOrder` → `Customer` via `customer_id` ✓
- `DeliveryOrder` → `CustomerAddress` via `address_id` ✓
- `DeliveryOrder` → `DeliveryOrderItem` (1:N) → `Product` ✓
- `DeliveryOrder` → `SalesTransaction` (1:1) for billing ✓
- `DeliveryOrder` has `branch_id` for branch isolation ✓

**Gap:** `DeliveryOrderItem` does not directly deduct from `BranchInventory` — inventory deduction happens indirectly when the `SalesTransaction` is created. This is architecturally correct but requires careful transaction orchestration in the application layer.

---

### Q5: Can branch data remain isolated?

**Answer: MOSTLY — with gaps.**

- Most operational models have `branch_id` ✓
- `Branch` → `User`, `Shift`, `SalesTransaction`, `DeliveryOrder`, `ProductionBatch`, etc. all have `branch_id` ✓

**Gaps:**
- `UserRoleAssignment` missing `tenant_id` (FIX-02) — role assignments could leak across tenants.
- `GallonStatusHistory`, `GallonInspection`, `GallonFillLog` missing `tenant_id` — gallon audit trails could leak across tenants.
- `DeliveryProof` missing `tenant_id` — proof records could leak across tenants.
- `Installment` missing `tenant_id` — installment plans could leak across tenants.

---

## 5. Migration Readiness Assessment

| Prerequisite | Status | Notes |
|---|---|---|
| Prisma schema syntax | ✅ Valid | No syntax errors detected |
| Enum coverage | ⚠️ Partial | `ContainerMovement.movement_type` should use `MovementType` enum |
| FK constraints | ✅ Valid | All FKs reference existing models |
| Unique constraints | ⚠️ Partial | Missing on `ResellerConsignment`, `CustomerStatement` |
| Indexes | ⚠️ Partial | 9 FK columns missing indexes |
| Soft delete | ❌ Missing | `deleted_at` not present on any model |
| Multi-tenant columns | ⚠️ Partial | 9 models missing `tenant_id` |
| Seed data | ✅ Ready | `backend/prisma/seed.ts` exists with realistic data |
| Migration tooling | ✅ Ready | `prisma migrate dev` configured in package.json |

### Steps to Achieve Migration Readiness

1. **Apply FIX-01:** Add `deleted_at` to all 48 models.
2. **Apply FIX-02:** Add `tenant_id` to the 9 missing models.
3. **Apply FIX-03:** Change `ContainerMovement.movement_type` from `String` to `MovementType`.
4. **Apply IMP-01:** Add missing indexes.
5. **Apply IMP-02:** Add missing `updated_by` columns.
6. **Apply IMP-03:** Add missing unique constraints.
7. Run `npx prisma migrate dev --name init` to generate the initial migration.
8. Run `npx prisma db seed` to verify seed data.
9. Run `npx prisma studio` to visually verify the schema.

---

## 6. Architectural Decisions Record (ADR)

| ADR | Decision | Status |
|---|---|---|
| ADR-001 | Use UUID primary keys for all models | Approved |
| ADR-002 | Use DECIMAL(12,2) for all monetary values | Approved |
| ADR-003 | Use TIMESTAMPTZ for all datetime columns | Approved |
| ADR-004 | Implement soft deletes via `deleted_at` on all models | **Pending fix** |
| ADR-005 | Enforce multi-tenant isolation via `tenant_id` on all models | **Pending fix** |
| ADR-006 | Use enums for all status/type fields | Approved (except `ContainerMovement`) |
| ADR-007 | Track gallon lifecycle via dedicated history/cleaning/inspection/fill models | Approved |
| ADR-008 | Use polymorphic holder pattern for container custody | Approved |
| ADR-009 | Support idempotency keys on sales transactions for offline sync | Approved |
| ADR-010 | Store settings as JSONB key-value pairs | Approved |

---

## 7. Conclusion

The database design is **architecturally strong** and covers the full business domain of a commercial water refilling station. The gallon lifecycle is well-modeled with complete auditability. Financial integrity is ensured through DECIMAL precision and ledger-based tracking. RBAC is properly structured.

**Before backend implementation proceeds, the 3 critical fixes (FIX-01, FIX-02, FIX-03) must be applied.** The recommended improvements (IMP-01 through IMP-08) should be addressed during the initial development phase.

**Do not modify the schema directly.** All changes should be made via Prisma migrations to maintain version control and rollback capability.
