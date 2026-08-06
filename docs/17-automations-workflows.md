# 17. Automations & Workflows

This section outlines key automations and operational workflows within the Water Station Management System (WSMS), detailing how routine tasks are handled automatically or guided through a defined process.

## 17.1 Automations

### 17.1.1 Inventory Auto-Deduction & Increment
- **Description:** Real-time adjustment of `branch_inventory.quantity_on_hand` based on sales, returns, production, and transfers.
- **Trigger:** `sales_transaction` completed, `sales_transaction` refunded/voided, `production_batch` recorded, `stock_transfer` received/sent, `inventory_adjustment` posted.
- **Action:** Decrement stock for sales/transfers-out/write-offs; increment stock for production/purchases/transfers-in/returns.

### 17.1.2 Container Status Update Automation
- **Description:** Automatic updates to individual `containers.status` and `current_holder`.
- **Trigger:** Container issued in a `sales_transaction`, empty container returned in a `sales_transaction`, container assigned to `delivery_order` (rider), container taken by `reseller` (consignment), container marked `damaged`/`lost`/`retired`.
- **Action:** Update status and holder IDs accordingly (e.g., `in_stock` → `with_customer` for filled issuance; `with_customer` → `in_stock` for empty return).

### 17.1.3 Customer Loyalty Points Accrual
- **Description:** Automatic calculation and addition of loyalty points to a `customer` account.
- **Trigger:** `sales_transaction` completed where customer is attached.
- **Action:** Add points based on configured rules (e.g., 1 point per ₱100 spent) to `customer.loyalty_points`, record in `loyalty_transactions`.

### 17.1.4 Automated Overdue Payment Reminders
- **Description:** Scheduled sending of SMS/email reminders for outstanding credit balances.
- **Trigger:** Daily scheduled job checks `customer_ledger` for entries past their due date (e.g., 3 days before, on due date, 3 days after).
- **Action:** Send `FR-NOT-004` (Payment Due/Overdue Reminder) to affected customers, log reminder in `notifications` table.

### 17.1.5 Recurring (Standing) Order Generation
- **Description:** Automatic creation of `delivery_orders` from active `standing_orders`.
- **Trigger:** Scheduled job runs at defined frequency (e.g., weekly) and `standing_order.next_run_date` matches current date.
- **Action:** Create a new `delivery_order` for the customer with the predefined items, update `standing_order.next_run_date`.

### 17.1.6 Automated Database Backups
- **Description:** Scheduled backup of the entire database.
- **Trigger:** Configured schedule (e.g., daily at 2 AM).
- **Action:** Execute database backup, store in cloud object storage, record result in `backups` table, send `FR-NOT-008` (System Health Alert) on failure.

### 17.1.7 Report Scheduling and Delivery
- **Description:** Automated generation and distribution of business reports.
- **Trigger:** Configured report schedule (e.g., daily sales report at 9 PM).
- **Action:** Generate report (e.g., PDF), email to configured recipients.

## 17.2 Workflows

### 17.2.1 Shift Open/Close Workflow (Cashier)
- **Description:** Process for cashiers to start and end their workday, ensuring cash accountability.
- **Steps:**
  1. **Open Shift:** Cashier logs in, enters `opening_cash` amount, system creates `shift` record.
  2. **Throughout Shift:** Cashier processes sales, records payments, performs voids/refunds.
  3. **Close Shift:** Cashier performs cash count (`closing_cash_actual`), system generates X-reading (current sales), Z-reading (shift summary), computes `variance`. Cashier submits for approval.
  4. **Approval:** Branch Manager/Owner reviews variance, approves/rejects shift closure. Audit log records action.
- **Related Notifications:** None directly, but `FR-NOT-008` (System Health Alert) could trigger if shift close fails.
- **Related Reports:** Daily Sales Report (Z-reading), Cashier Reconciliation Report.

### 17.2.2 Void/Refund Approval Workflow
- **Description:** Multi-step approval process for sensitive financial adjustments.
- **Steps:**
  1. **Initiation:** Cashier initiates void/refund, enters `reason`.
  2. **Threshold Check:** System checks if amount exceeds cashier's limit; if so, requires supervisor approval.
  3. **Approval Request:** `FR-NOT-004` (Void/Refund Approval Request) sent to Branch Manager/Owner.
  4. **Approval Action:** Manager logs in, reviews request, enters PIN/password to `approve`/`deny`. Audit log records action.
  5. **Transaction Update:** If approved, system marks `sales_transaction` as `void` or `refunded`, reverses `inventory_ledger` entries, updates `customer_ledger`.
- **Related Notifications:** `FR-NOT-004` (Void/Refund Approval Request).

### 17.2.3 Stock Transfer Workflow
- **Description:** Controlled movement of inventory between branches with approval and reconciliation.
- **Steps:**
  1. **Request:** Origin `inventory_staff` creates `stock_transfer` request, specifying destination, items, quantities.
  2. **Origin Approval:** Origin `branch_manager` approves request. `FR-NOT-005` (Stock Transfer Approval Request) sent.
  3. **Dispatch:** Origin staff deducts stock, sets status to `in_transit` for items, prepares shipment.
  4. **Receipt:** Destination `inventory_staff` receives shipment, verifies quantities, marks transfer `received`.
  5. **Reconciliation:** System increments stock at destination. If `quantity_received` ≠ `quantity_sent`, system flags `discrepancy` for manager review.
- **Related Notifications:** `FR-NOT-005` (Stock Transfer Approval Request).

### 17.2.4 Physical Stock Count Workflow
- **Description:** Guided process to reconcile physical inventory with system records.
- **Steps:**
  1. **Initiate Session:** `inventory_staff` starts a `stock_count_session` for specific products/categories.
  2. **Freeze Book Quantity:** System records `book_quantity` snapshot for selected items.
  3. **Physical Count:** Staff counts physical stock, enters `counted_quantity` into the system.
  4. **Variance Calculation:** System computes `variance`.
  5. **Submission for Approval:** Staff submits `stock_count_session`.
  6. **Approval:** `FR-NOT-006` (Stock Count Variance Approval Request) sent to `branch_manager`. Manager reviews, approves/rejects adjustments.
  7. **Adjustment:** If approved, system creates `inventory_ledger` adjustment entries to correct stock levels.
- **Related Notifications:** `FR-NOT-006` (Stock Count Variance Approval Request).

### 17.2.5 Credit Limit Increase Request Workflow
- **Description:** Process for customers to request a higher credit limit, requiring owner approval.
- **Steps:**
  1. **Request:** Customer (via app/portal) or staff (on behalf of customer) requests credit limit increase for a `customer`.
  2. **Review:** System flags request for `owner` review.
  3. **Approval Action:** `owner` reviews customer history, financial standing, approves/denies request. Action logged in `audit_logs`.
  4. **Update Limit:** If approved, `customer.credit_limit` is updated.
- **Related Notifications:** None directly, but internal message to owner.

### 17.2.6 Rider Container Reconciliation Workflow
- **Description:** Daily process to ensure accountability for containers loaded out and returned by riders.
- **Steps:**
  1. **Load-out:** At shift start, `dispatcher` or `inventory_staff` records containers (filled) loaded onto `rider` via `rider_shifts`.
  2. **Deliveries/Pickups:** Throughout shift, `rider` records containers delivered and empties picked up via `delivery_orders`.
  3. **Return & Count:** At shift end, `rider` returns to branch. `dispatcher` or `inventory_staff` physically counts remaining filled containers and collected empties.
  4. **Reconciliation:** System compares actual counts against expected (`rider_shifts.containers_loaded_out` minus delivered, plus collected empties). `rider_shifts.variance` calculated.
  5. **Closure:** `dispatcher` closes `rider_shift`, notes any discrepancies requiring investigation.
- **Related Notifications:** None directly.
