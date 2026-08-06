# 7. Database Design

Relational database design (PostgreSQL-flavored types shown; adaptable to MySQL/MariaDB). All tenant-scoped tables include `tenant_id` (for multi-tenant SaaS) and `branch_id` (for multi-branch isolation) where applicable. All transactional tables use **soft deletes** (`deleted_at`) and include `created_at`, `updated_at`, `created_by`, `updated_by` audit columns (omitted below for brevity except where noted explicitly).

## 7.1 Core / Tenancy

### `tenants`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | VARCHAR | Business name |
| subscription_plan | VARCHAR | e.g., basic/pro/enterprise |
| subscription_status | VARCHAR | active/suspended/cancelled |
| created_at | TIMESTAMP | |

### `branches`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK → tenants.id | |
| name | VARCHAR | |
| address | TEXT | |
| contact_number | VARCHAR | |
| tin | VARCHAR | Tax Identification Number |
| is_hq | BOOLEAN | |
| status | VARCHAR | active/inactive |

## 7.2 Identity & Access

### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK | |
| branch_id | UUID FK NULLABLE | NULL for tenant-wide roles (Owner) |
| full_name | VARCHAR | |
| email | VARCHAR UNIQUE | |
| phone | VARCHAR | |
| password_hash | VARCHAR | |
| pin_hash | VARCHAR NULLABLE | For POS quick auth |
| status | VARCHAR | active/disabled/locked |
| last_login_at | TIMESTAMP | |

### `roles`
| id | code | name | is_system_role |
|---|---|---|---|
| UUID PK | VARCHAR (owner, branch_manager, cashier, inventory_staff, rider, dispatcher, accountant, reseller, customer, technician, super_admin) | VARCHAR | BOOLEAN |

### `permissions`
| id | module | action | code |
|---|---|---|---|
| UUID PK | VARCHAR | VARCHAR (create/read/update/delete/approve) | VARCHAR unique |

### `role_permissions`
| role_id FK | permission_id FK | (composite PK) |

### `user_roles`
| user_id FK | role_id FK | branch_id FK NULLABLE | (composite PK) |

### `audit_logs`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK | |
| user_id | UUID FK NULLABLE | |
| action | VARCHAR | e.g., VOID_TRANSACTION, LOGIN, UPDATE_PRICE |
| entity_type | VARCHAR | |
| entity_id | UUID | |
| before_data | JSONB | |
| after_data | JSONB | |
| ip_address | VARCHAR | |
| created_at | TIMESTAMP | |

## 7.3 Product & Inventory

### `product_categories`
id, tenant_id, name, parent_category_id (self-FK, nullable)

### `products`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK | |
| category_id | UUID FK | |
| sku | VARCHAR UNIQUE (per tenant) | |
| name | VARCHAR | |
| type | VARCHAR | finished_good / raw_material / container / accessory / service |
| unit_of_measure | VARCHAR | piece/liter/gallon |
| base_price | DECIMAL(12,2) | |
| cost_price | DECIMAL(12,2) | |
| is_container | BOOLEAN | true if this SKU represents a trackable container type |
| deposit_amount | DECIMAL(12,2) NULLABLE | container deposit price |
| reorder_level | INTEGER | |
| status | VARCHAR | active/discontinued |

### `branch_inventory`
| branch_id FK | product_id FK | quantity_on_hand | reserved_quantity | last_counted_at | (composite PK: branch_id, product_id) |

### `inventory_ledger`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK | |
| branch_id | UUID FK | |
| product_id | UUID FK | |
| movement_type | VARCHAR | sale, purchase, production, transfer_in, transfer_out, adjustment, write_off, return |
| quantity_delta | INTEGER | positive or negative |
| reference_type | VARCHAR | sale/transfer/stock_count/production_batch |
| reference_id | UUID | |
| created_at | TIMESTAMP | |
| created_by | UUID FK users.id | |

### `containers`
Individual trackable asset units (per-unit ledger, distinct from bulk `products` stock counts).
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK | |
| product_id | UUID FK | container type |
| tag_code | VARCHAR UNIQUE | QR/barcode value physically printed on container |
| status | VARCHAR | in_stock, with_customer, with_rider, with_reseller, damaged, lost, retired |
| current_holder_type | VARCHAR | branch/customer/rider/reseller |
| current_holder_id | UUID NULLABLE | polymorphic reference |
| current_branch_id | UUID FK NULLABLE | |
| created_at | TIMESTAMP | |

### `container_movements`
| id | container_id FK | movement_type (issued, returned, transferred, lost, damaged, retired) | from_holder_type/id | to_holder_type/id | reference_type | reference_id | created_at |

### `production_batches`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| branch_id | UUID FK | |
| batch_number | VARCHAR | |
| raw_input_liters | DECIMAL | |
| output_product_id | UUID FK products.id | |
| output_quantity | INTEGER | |
| operator_id | UUID FK users.id | |
| quality_check_passed | BOOLEAN | |
| quality_notes | TEXT | |
| produced_at | TIMESTAMP | |

### `stock_transfers`
| id, tenant_id, origin_branch_id, destination_branch_id, status (pending/approved/in_transit/received/discrepancy), requested_by, approved_by, created_at, received_at |

### `stock_transfer_items`
| id, stock_transfer_id FK, product_id FK, container_id FK NULLABLE, quantity_sent, quantity_received |

### `stock_count_sessions`
| id, branch_id, status (open/submitted/approved), initiated_by, approved_by, created_at, approved_at |

### `stock_count_items`
| id, session_id FK, product_id FK, book_quantity, counted_quantity, variance (generated), notes |

### `equipment`
| id, branch_id, name, type (RO_membrane, sediment_filter, carbon_filter, UV_lamp, dispenser_machine), serial_number, installed_at |

### `maintenance_logs`
| id, equipment_id FK, technician_id FK users.id, maintenance_type, performed_at, next_due_at, notes |

### `gallon_types`
Defines the types of physical gallon containers (distinct from products).
| id, tenant_id, product_id FK products.id, name (e.g., "5-Gallon Round"), description, capacity_liters, material, color, is_active |

### `gallons`
Individual trackable gallon container units (full lifecycle tracking).
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK | |
| branch_id | UUID FK | |
| gallon_type_id | UUID FK → gallon_types.id | |
| tag_code | VARCHAR UNIQUE | QR/barcode physically printed |
| serial_number | VARCHAR UNIQUE | |
| status | VARCHAR | in_stock, with_customer, with_rider, with_reseller, damaged, lost, retired, cleaning, inspection, filled |
| current_holder_type | VARCHAR | branch/customer/rider/reseller |
| current_holder_id | UUID NULLABLE | polymorphic |
| current_condition | VARCHAR | good/fair/poor |
| purchase_date | TIMESTAMP | |
| purchase_price | DECIMAL(10,2) | |
| last_cleaned_at | TIMESTAMP | |
| last_inspected_at | TIMESTAMP | |
| last_filled_at | TIMESTAMP | |
| total_fill_count | INTEGER | |
| total_cleanings | INTEGER | |
| is_active | BOOLEAN | |

### `gallon_status_history`
Full audit trail of every status change for a gallon.
| id, gallon_id FK, status, reason, changed_by, changed_at, notes |

### `gallon_cleaning_records`
Cleaning/sanitization events for each gallon.
| id, gallon_id FK, branch_id, cleaned_by (user_id), cleaning_type (wash/sanitize/deep_clean), used_detergents (JSONB), ph_level, is_passed, notes, cleaned_at |

### `gallon_inspections`
Inspection events for each gallon.
| id, gallon_id FK, branch_id, inspected_by (user_id), condition, has_cracks, has_stains, is_odor_free, seal_intact, overall_grade, notes, passed, inspected_at |

### `gallon_fill_logs`
Filling events for each gallon.
| id, gallon_id FK, branch_id, production_batch_id FK NULLABLE, filled_by (user_id), fill_volume_liters, water_source, purification_stages (JSONB), quality_check_passed, ph_level, tds_level, filled_at |

## 7.4 Customer / CRM

### `customers`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK | |
| branch_id | UUID FK | home branch |
| customer_type | VARCHAR | retail/reseller/corporate |
| full_name | VARCHAR | |
| phone | VARCHAR | |
| email | VARCHAR NULLABLE | |
| credit_limit | DECIMAL(12,2) DEFAULT 0 | |
| current_balance | DECIMAL(12,2) DEFAULT 0 | receivable balance |
| loyalty_points | INTEGER DEFAULT 0 | |
| loyalty_tier | VARCHAR NULLABLE | |
| status | VARCHAR | active/inactive/blocked |
| created_at | TIMESTAMP | |

### `customer_addresses`
| id, customer_id FK, label (home/office), address_line, barangay, city, latitude, longitude, is_default |

### `customer_container_balances`
| customer_id FK, product_id FK (container type), quantity_held | composite PK |

### `customer_tags`
| id, customer_id FK, tag_name |

### `customer_complaints`
| id, customer_id FK, subject, description, status (open/in_progress/resolved), assigned_to, created_at, resolved_at |

### `loyalty_transactions`
| id, customer_id FK, transaction_type (earn/redeem/expire), points, reference_type, reference_id, created_at |

## 7.5 Reseller

### `resellers`
| id, customer_id FK (extends customer), pricing_tier, commission_rate, status |

### `reseller_consignments`
| id, reseller_id FK, product_id FK, quantity_consigned, quantity_sold, quantity_returned, status (open/settled), created_at, settled_at |

## 7.6 Sales / POS

### `shifts`
| id, branch_id FK, cashier_id FK users.id, opening_cash, closing_cash_expected, closing_cash_actual, variance, status (open/closed), opened_at, closed_at |

### `sales_transactions`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK | |
| branch_id | UUID FK | |
| shift_id | UUID FK NULLABLE | |
| customer_id | UUID FK NULLABLE | null = walk-in guest |
| invoice_number | VARCHAR UNIQUE per branch | sequential |
| channel | VARCHAR | pos/delivery/reseller |
| subtotal | DECIMAL(12,2) | |
| discount_total | DECIMAL(12,2) | |
| tax_total | DECIMAL(12,2) | |
| grand_total | DECIMAL(12,2) | |
| status | VARCHAR | completed/void/refunded |
| void_reason | TEXT NULLABLE | |
| voided_by | UUID FK NULLABLE | |
| idempotency_key | VARCHAR UNIQUE | for offline sync dedup |
| created_by | UUID FK users.id | cashier/rider |
| created_at | TIMESTAMP | |

### `sales_transaction_items`
| id, sales_transaction_id FK, product_id FK, container_id FK NULLABLE, quantity, unit_price, discount_amount, line_total |

### `sales_transaction_container_exchanges`
| id, sales_transaction_id FK, product_id FK (container type), empties_received, filled_issued, deposit_charged_amount |

### `discounts`
| id, tenant_id, code, name, type (percentage/fixed), value, requires_approval, valid_from, valid_to, status |

### `promotions`
| id, tenant_id, name, description, discount_id FK NULLABLE, start_date, end_date, target_segment |

## 7.7 Delivery

### `delivery_orders`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK | |
| branch_id | UUID FK | |
| customer_id | UUID FK | |
| address_id | UUID FK customer_addresses.id | |
| order_type | VARCHAR | one_time/standing |
| requested_at | TIMESTAMP | |
| status | VARCHAR | pending/assigned/out_for_delivery/delivered/failed/returned/cancelled |
| assigned_rider_id | UUID FK users.id NULLABLE | |
| payment_method | VARCHAR | cash/gcash/maya/on_account |
| sales_transaction_id | UUID FK NULLABLE | linked once fulfilled/billed |
| failure_reason | TEXT NULLABLE | |
| proof_photo_url | VARCHAR NULLABLE | |
| proof_signature_url | VARCHAR NULLABLE | |
| delivered_at | TIMESTAMP NULLABLE | |
| created_at | TIMESTAMP | |

### `delivery_order_items`
| id, delivery_order_id FK, product_id FK, quantity, unit_price |

### `standing_orders`
| id, customer_id FK, frequency (weekly/biweekly/monthly), day_of_week, items (JSONB or via standing_order_items), next_run_date, status (active/paused/cancelled) |

### `standing_order_items`
| id, standing_order_id FK, product_id FK, quantity |

### `delivery_routes`
| id, branch_id, route_name, rider_id FK NULLABLE, route_date, status (planned/in_progress/completed) |

### `route_stops`
| id, route_id FK, delivery_order_id FK, sequence_number, status |

### `rider_shifts`
| id, rider_id FK, branch_id FK, containers_loaded_out, containers_returned, cash_collected_expected, cash_collected_actual, status (open/closed), opened_at, closed_at |

## 7.8 Payments & Billing

### `payments`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK | |
| sales_transaction_id | UUID FK NULLABLE | |
| customer_id | UUID FK NULLABLE | for account payments not tied to single sale |
| payment_method | VARCHAR | cash/gcash/maya/bank_transfer/card/check |
| amount | DECIMAL(12,2) | |
| reference_number | VARCHAR NULLABLE | e-wallet/bank ref |
| status | VARCHAR | completed/pending/failed/reconciled |
| collected_by | UUID FK users.id | |
| created_at | TIMESTAMP | |

### `customer_statements`
| id, customer_id FK, period_start, period_end, opening_balance, charges_total, payments_total, closing_balance, generated_at |

### `customer_ledger`
| id, customer_id FK, entry_type (sale/payment/deposit/refund/adjustment), amount, running_balance, reference_type, reference_id, created_at |

### `container_deposits`
| id, customer_id FK, product_id FK (container type), quantity, unit_deposit_amount, total_amount, status (held/refunded), created_at, refunded_at |

## 7.9 Notifications

### `notifications`
| id, tenant_id, user_id FK NULLABLE, customer_id FK NULLABLE, channel (sms/email/push/in_app), template_code, payload (JSONB), status (queued/sent/failed/retrying), retry_count, sent_at, created_at |

### `notification_templates`
| id, tenant_id, code, channel, subject, body_template |

## 7.10 System / Settings

### `settings`
| id, tenant_id, branch_id NULLABLE, key, value (JSONB), updated_at |
Examples of keys: `tax_rate`, `container_deposit_default`, `credit_limit_default`, `void_approval_threshold`, `loyalty_earn_rate`.

### `backups`
| id, tenant_id, file_path/url, size_bytes, status (success/failed), triggered_by (scheduled/manual), created_at |

### `integrations`
| id, tenant_id, provider (sms_gateway/gcash/maps), config (JSONB, secrets encrypted), status (active/inactive) |

## 7.11 Key Constraints & Business Rules Enforced at DB Level

- `sales_transactions.invoice_number` unique per `branch_id`, generated via a per-branch sequence — never reused even on void.
- `branch_inventory.quantity_on_hand` must never go negative unless `settings.allow_negative_stock = true` (enforced via application-level check + DB check constraint as defense-in-depth).
- `customers.current_balance` must not exceed `credit_limit` without an audit-logged override flag on the triggering transaction.
- `containers.tag_code` globally unique to prevent duplicate physical tags.
- All monetary columns use `DECIMAL(12,2)` — never floating point — to avoid rounding errors.
- Foreign keys use `ON DELETE RESTRICT` for financial/inventory records; soft-delete pattern used instead of hard deletes on `sales_transactions`, `payments`, `customers`, `containers`.
