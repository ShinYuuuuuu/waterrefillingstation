# 18. Inventory Process

This section details the inventory and container management processes within the Water Station Management System (WSMS), outlining the workflows for product lifecycle, stock tracking, production, and asset management.

## 18.1 Product Catalog Management

- **Objective:** Maintain an accurate catalog of water products and services. The owner configures a unit price; the cashier enters quantity during each sale.
- **Process:**
  1. **Define Product Categories:** Create a hierarchical structure (e.g., Water Products, Accessories, Raw Materials, Containers).
  2. **Add New Product:**
     - Provide `SKU`, `name`, `category`, `type` (finished_good, raw_material, container, accessory, service).
     - Set `unit_of_measure` (piece, liter, gallon).
     - Specify `base_price` (selling price) and `cost_price` (for profitability calculations).
     - If `type` is 'container', mark `is_container=true` and define `deposit_amount`.
     - Set `reorder_level` for stock alerts.
     - Set initial `status` (active).
  3. **Update Product:** Modify pricing, description, reorder levels, or status as needed.
  4. **Deactivate/Archive Product:** Change `status` to 'discontinued' for items no longer sold (soft delete).
- **CRUD Modules:** Product Categories (CRUD), Products (CRUD).

## 18.2 Stock Tracking & Movement

- **Objective:** Accurately track quantities on hand for all products across branches and record all stock movements.
- **Process:**
  1. **Initial Stock Entry:** Record starting quantities for all products at each `branch` into `branch_inventory`.
  2. **Sales Deductions:** When a `sales_transaction` is completed, the system automatically deducts sold `quantity` from `branch_inventory.quantity_on_hand` at the respective branch.
  3. **Purchase/Receipts:** When raw materials or finished goods are purchased from suppliers, `inventory_staff` records the incoming `quantity`, which increments `branch_inventory.quantity_on_hand`.
  4. **Production Increment:** After a `production_batch` is completed, the system increments the `quantity_on_hand` for the `output_product` at the production `branch`.
  5. **Stock Transfers:** See Section 17.2.3 (Stock Transfer Workflow) for inter-branch transfers.
  6. **Adjustments/Write-offs:** `Inventory_staff` can initiate manual adjustments (e.g., for damage, loss, shrinkage) with mandatory reason and manager approval (see Section 17.2.4 for stock count).
  7. **Returns:** When `sales_transaction` items are returned by a customer, `branch_inventory` is incremented.
- **Key Entities:** `products`, `branch_inventory`, `inventory_ledger`.
- **CRUD Modules:** Inventory Adjustments (Create/Read/Approve).

## 18.3 Aggregate Gallon Inventory Management

- **Objective:** Track the shop-owned gallon pool using aggregate counts suitable for real-world circulation where individual gallons cannot be followed reliably.
- **Process:**
  1. **Container Registration:** When new physical containers are acquired, `inventory_staff` registers them by scanning their unique `tag_code` (QR/barcode) and associating them with a `product` type (e.g., 5-gallon round bottle). Initial `status` is `in_stock`, `current_holder_type` is `branch`, `current_holder_id` is the `branch.id`.
  2. **Issuance to Customer (Deposit Charged):** When a customer takes a filled container and doesn't return an empty, the system records the `container` as `with_customer`, updates `current_holder_id` to `customer.id`, and charges `deposit_amount` (logged in `container_deposits`).
  3. **Exchange (1:1):** During a sale/delivery, if a customer returns an empty container and takes a filled one, the `current_holder` remains the `customer`, but the system logs the `container_movements` (empty returned, full issued).
  4. **Return to Stock (Deposit Refunded):** When a customer returns a container and requests a deposit refund, system verifies the container is returned, processes the refund, and changes `container.status` back to `in_stock` (or `damaged`/`retired` if applicable).
  5. **Rider/Reseller Load-out:** When containers are given to a `rider` for delivery or a `reseller` for consignment, their `current_holder_type` and `current_holder_id` are updated accordingly.
  6. **Damage/Loss/Retirement:** `Inventory_staff` marks `containers` as `damaged`, `lost`, or `retired` with a reason. These containers are no longer counted in active inventory or customer balances.
- **Key Entities:** `containers`, `container_movements`, `container_deposits`, `customers`, `products`.
- **CRUD Modules:** Container Registration (Create), Container Status Update (Update), Container Movement History (Read).

## 18.4 Production Management

- **Objective:** Record the process of purifying water and producing filled containers, contributing to finished goods inventory.
- **Process:**
  1. **Start Production Batch:** `Inventory_staff` initiates a new `production_batch` record.
  2. **Record Inputs:** Optionally record `raw_input_liters` (e.g., source water consumed) and other raw materials (filters, caps, seals).
  3. **Record Output:** Specify `output_product_id` (e.g., 5-gallon purified water) and `output_quantity`.
  4. **Quality Control:** `Inventory_staff` performs `quality_check_passed` (boolean) and adds any `quality_notes`.
  5. **Finalize Batch:** `produced_at` and `operator_id` are recorded. System automatically increments `branch_inventory.quantity_on_hand` for the `output_product` and logs `inventory_ledger` entry.
- **Key Entities:** `production_batches`, `products`, `inventory_ledger`.
- **CRUD Modules:** Production Batches (CRUD).

## 18.5 Equipment Maintenance Management

- **Objective:** Schedule and track maintenance for water purification equipment and components.
- **Process:**
  1. **Register Equipment:** Record all relevant `equipment` (RO membranes, filters, UV lamps, dispensers) with serial numbers, installation dates, and types.
  2. **Set Maintenance Schedules:** Define `next_due_at` based on usage or time (e.g., filter replacement every 3 months, RO membrane every 2 years).
  3. **Log Maintenance:** When a `technician` performs maintenance, they log a `maintenance_log` entry, including `maintenance_type`, `performed_at`, `next_due_at`, and `notes`.
  4. **Alerts:** System generates `FR-NOT-007` (Equipment Maintenance Due Soon/Overdue) notifications to relevant staff.
- **Key Entities:** `equipment`, `maintenance_logs`.
- **CRUD Modules:** Equipment (CRUD), Maintenance Logs (CRUD).
