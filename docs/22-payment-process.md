# 22. Payment Process

This section details the payment, billing, and collections processes within the Water Station Management System (WSMS), covering all payment channels, billing workflows, and collections management.

## 22.1 Payment Recording

- **Objective:** Record all payments received from customers across multiple channels with full traceability.
- **Process:**
  1. **Payment Initiation:** Payment is recorded at the point of sale (POS) during transaction finalization, or separately for on-account/credit sales.
  2. **Payment Methods Supported:**
     - **Cash:** Physical currency. Cashier enters `amount_tendered`, system computes `change`.
     - **GCash:** E-wallet payment via GCash. Payment reference number recorded.
     - **Maya:** E-wallet payment via Maya. Payment reference number recorded.
     - **Bank Transfer:** Bank deposit/transfer. Reference number and bank name recorded.
     - **Credit/Debit Card:** Card payment via connected payment terminal. Last 4 digits recorded.
     - **Check:** Check payment. Check number, bank, and date recorded.
     - **On-Account/Credit:** Sale billed to customer's credit account. No immediate payment received.
     - **Split Payment:** Multiple payment methods used in a single transaction (e.g., cash + GCash).
  3. **Payment Record:** Each payment creates a `payments` record with:
     - `amount`
     - `payment_method`
     - `reference_number` (transaction ID, check number, etc.)
     - `received_by` (user who recorded the payment)
     - `received_at` (timestamp)
     - `linked_transaction_id` (reference to `sales_transaction.id` or `delivery_order.id`)
     - `status` (`pending`, `confirmed`, `reconciled`, `disputed`)
  4. **E-Wallet/Bank Verification:** For digital payments, staff may need to verify the transaction before confirming. System can auto-verify via API integration where available.
- **Key Entities:** `payments`, `sales_transactions`, `delivery_orders`, `customers`, `payment_methods`.
- **CRUD Modules:** Payments (CRUD), Payment Methods (Read-only configuration).

## 22.2 On-Account / Credit Billing

- **Objective:** Manage sales billed to customer credit accounts, including statement generation and installment tracking.
- **Process:**
  1. **Credit Sale:** During checkout, if a customer chooses to bill to their credit account:
     - System checks `current_balance` against `credit_limit`.
     - If within limit, the sale is recorded as a `sales_transaction` with `payment_method = credit`.
     - A `customer_ledger` entry is created with `amount_due`, `due_date`, and `status = outstanding`.
  2. **Invoice Generation:** System generates an invoice or Official Receipt / Sales Invoice with BIR-compliant sequential numbering. Invoice is linked to the `sales_transaction`.
  3. **Statement Generation:** System generates periodic account statements (weekly, monthly, or on-demand) showing:
     - All transactions on account.
     - Payments received.
     - Current outstanding balance.
     - Aging breakdown.
  4. **Installment Tracking:** For customers on installment plans:
     - Each installment is a separate `customer_ledger` entry with its own `due_date` and `amount_due`.
     - System tracks `installment_number` and `total_installments`.
     - Overdue installments are flagged and trigger reminders.
- **Key Entities:** `customer_ledger`, `sales_transactions`, `customers`, `invoices`.
- **CRUD Modules:** Customer Ledger (CRUD), Invoices (CRUD).

## 22.3 Partial Payments & Installments

- **Objective:** Support partial payments and installment plans for credit customers.
- **Process:**
  1. **Partial Payment:** Customer pays less than the full outstanding balance.
     - System records the payment and applies it to the oldest outstanding `customer_ledger` entry first (FIFO), or to a specific entry if selected.
     - Remaining balance stays as `outstanding`.
     - System updates `customer_ledger` status accordingly.
  2. **Installment Plan Setup:** Owner or Branch Manager can set up an installment plan for a customer:
     - Define `total_amount`, `number_of_installments`, `interval_days`, and `start_date`.
     - System generates `customer_ledger` entries for each installment automatically.
  3. **Installment Payment:** When a customer pays an installment:
     - Payment is applied to the specific installment's `customer_ledger` entry.
     - Status changes to `paid`.
     - System checks if all installments are complete and updates the customer's credit status.
  4. **Early Payment:** Customer can pay off remaining installments early. System recalculates and marks all remaining entries as `paid`.
- **Key Entities:** `customer_ledger`, `payments`, `installment_plans`.
- **CRUD Modules:** Installment Plans (CRUD), Customer Ledger (CRUD), Payments (CRUD).

## 22.4 Collections Management

- **Objective:** Track outstanding receivables and manage the collections process.
- **Process:**
  1. **Aging Report:** System maintains an aging report of all outstanding `customer_ledger` entries, categorized by aging bucket:
     - Current (not yet due).
     - 1-30 days overdue.
     - 31-60 days overdue.
     - 61-90 days overdue.
     - 90+ days overdue.
  2. **Follow-Up Reminders:** Automated reminders are sent at configured intervals (see `16-notifications.md` and `17-automations-workflows.md`):
     - 3 days before due date: Friendly reminder.
     - On due date: Payment reminder.
     - 3 days after due date: Overdue notice.
     - 7 days after due date: Second overdue notice with escalation.
     - 30 days after due date: Final notice before escalation to collections.
  3. **Collections Actions:** When a customer account becomes severely delinquent:
     - Branch Manager can place the account on `credit_hold`, preventing new credit sales.
     - Owner can suspend the customer's account entirely.
     - All actions are logged in the audit trail with reason and approver.
  4. **Collections Report:** Accountant can run a collections report showing:
     - Total outstanding by aging bucket.
     - Top delinquent customers.
     - Collections progress over time.
- **Key Entities:** `customer_ledger`, `customers`, `notifications`, `audit_logs`.
- **CRUD Modules:** Customer Ledger (CRUD), Credit Holds (CRUD).

## 22.5 Deposit & Refund Handling

- **Objective:** Manage container deposit collections and refunds through the payment system.
- **Process:**
  1. **Deposit Collection:** When a customer takes a container on deposit, the `deposit_amount` is recorded as a payment entry linked to the `container_deposit` record.
  2. **Deposit Refund:** When a customer returns a container:
     - System verifies the container is returned and in acceptable condition.
     - A refund `payment` is created with `payment_method` matching the original deposit method (or configurable).
     - `container_deposit` entry is updated with `refund_amount` and `refunded_at`.
     - If the refund is to a different method (e.g., original was cash, refund to GCash), staff selects the refund method.
  3. **Deposit Forfeiture:** If a container is lost or damaged, the deposit may be forfeited per business rules. Owner/Branch Manager approval is required. The forfeited amount is recorded as income or written off per accounting policy.
  4. **Deposit Reconciliation:** Daily/weekly reconciliation of deposit collections vs. container holdings to ensure accuracy.
- **Key Entities:** `container_deposits`, `payments`, `containers`, `customers`.
- **CRUD Modules:** Container Deposits (CRUD), Payments (CRUD).

## 22.6 Payment Reconciliation

- **Objective:** Reconcile recorded payments against external statements (bank, e-wallet) to ensure accuracy.
- **Process:**
  1. **Export Records:** System allows exporting payment records in a format compatible with bank/e-wallet statement exports (e.g., CSV, Excel).
  2. **Import Statements:** Accountant imports bank or e-wallet statements (CSV, OFX, or manual entry).
  3. **Match Transactions:** Accountant matches system payment records to statement line items by:
     - Amount.
     - Date.
     - Reference number.
  4. **Reconciliation Status:** Each `payment` record gets a `reconciliation_status`:
     - `unreconciled` — not yet matched.
     - `reconciled` — matched to a statement line item.
     - `discrepancy` — matched but amount differs.
  5. **Discrepancy Handling:** Unmatched or discrepant entries are flagged for investigation. Accountant can add notes and mark as resolved.
  6. **Reconciliation Report:** System generates a reconciliation report showing matched/unmatched/missing items.
- **Key Entities:** `payments`, `bank_statements`, `reconciliation_entries`.
- **CRUD Modules:** Reconciliation Entries (CRUD), Bank Statements (CRU).

## 22.7 Invoice / Official Receipt / Sales Invoice Generation

- **Objective:** Generate BIR-compliant sequential invoices and receipts for all transactions.
- **Process:**
  1. **Invoice Generation:** When a `sales_transaction` is finalized, the system generates a sequential invoice number following the configured numbering scheme.
  2. **Invoice Types:**
     - **Official Receipt (OR):** For cash and e-wallet payments.
     - **Sales Invoice (SI):** For credit/on-account sales.
     - **Tax Invoice:** For VAT-registered transactions.
  3. **BIR Compliance:** Invoice numbers are sequential, non-reusable, and tamper-evident. Voided invoices are retained with a `voided` status and reason.
  4. **Print/Email:** Invoice can be printed (thermal or laser) or sent digitally via SMS/email.
  5. **Invoice Lookup:** Accountant/Owner can search and view any invoice by number, date range, or customer.
- **Key Entities:** `sales_transactions`, `invoices`, `customers`.
- **CRUD Modules:** Invoices (CRUD), Sales Transactions (Read/Update for void).