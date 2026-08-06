# 20. Sales Process

This section outlines the various sales processes within the Water Station Management System (WSMS), covering Point-of-Sale (POS) transactions, delivery sales, and reseller/dealer orders.

## 20.1 Point-of-Sale (POS) / Walk-in Sales

- **Objective:** Enable cashiers to quickly and accurately process sales for walk-in customers at the station counter.
- **Process:**
  1. **Shift Start:** `Cashier` logs in and opens their `shift`, recording `opening_cash` (see Section 17.2.1).
  2. **Start New Sale:** `Cashier` initiates a new `sales_transaction` in the POS interface.
  3. **Add Items:**
     - `Cashier` selects `products` from a quick-access grid or searches by `SKU`/name.
     - `Cashier` scans product barcodes/QR codes if available.
     - For water refills, `Cashier` records `quantity` of filled containers and `quantity` of empty containers returned by the customer (`sales_transaction_container_exchanges`).
  4. **Customer Lookup (Optional):** `Cashier` can search for and attach an existing `customer` to the `sales_transaction`. If not found, proceeds as a guest/walk-in.
  5. **Discounts & Promotions:** `Cashier` applies `discounts` (e.g., senior citizen, promo code, loyalty) or `promotions`. System validates eligibility and applies to line items or total. Manual discounts may require `Branch Manager` approval (`FR-POS-006`).
  6. **Credit Limit Check (if customer attached):** If the customer has a credit account and chooses to bill to it, the system checks `current_balance` against `credit_limit`. If exceeded, it prompts for `Branch Manager` approval (`FR-CRM-004`, Section 17.2.5).
  7. **Payment:** `Cashier` selects `payment_method`(s) (cash, e-wallet, credit/on-account). System calculates `grand_total`.
     - For cash, `Cashier` enters `amount_tendered`, system computes `change`.
     - For split payments, `Cashier` records multiple `payments` for the same `sales_transaction`.
  8. **Finalize Transaction:** System records `sales_transaction`, generates sequential `invoice_number`, deducts `branch_inventory`, updates `customer_container_balances` and `customer_ledger`.
  9. **Receipt:** System prints a thermal receipt and/or sends a digital receipt via SMS/email (`FR-POS-008`).
  10. **Shift End:** `Cashier` closes their `shift`, performing cash reconciliation (see Section 17.2.1).
- **Alternate Flows:**
  - **Hold/Park Sale:** `Cashier` can hold an incomplete `sales_transaction` and resume it later (`FR-POS-009`).
  - **Void Transaction:** `Cashier` or `Branch Manager` can void a completed `sales_transaction` with reason and approval (see Section 17.2.2).
  - **Refund/Return:** `Cashier` processes returns by linking to original `sales_transaction`, reversing items, and issuing refund (`FR-POS-011`).
- **Key Entities:** `sales_transactions`, `sales_transaction_items`, `sales_transaction_container_exchanges`, `shifts`, `products`, `customers`, `discounts`, `payments`.
- **CRUD Modules:** Sales Transactions (CRUD - with special void/refund actions), Shifts (CRU).

## 20.2 Delivery Sales

- **Objective:** Manage sales initiated through delivery orders, whether phone-in, walk-in, or via customer app.
- **Process:**
  1. **Order Creation:** (Covered in Section 19.1 - Order Intake). A `delivery_order` is created with items, customer, address, and requested delivery details.
  2. **Order Assignment:** (Covered in Section 19.2 - Order Dispatch & Route Management). `Dispatcher` assigns `delivery_order` to `rider`.
  3. **Fulfillment & Payment:** (Covered in Section 19.3 - Rider Mobile App Operations). `Rider` delivers, collects empties, collects COD `payment` (if applicable), and updates `delivery_order.status` to `delivered`.
  4. **Sales Transaction Generation:** Once `delivery_order` is `delivered` and `payment` is collected (or billed on-account), the system creates a `sales_transaction` record, linking it to the `delivery_order`. This transaction captures the final sale details, `grand_total`, `payment_method`, and updates `branch_inventory` and `customer_ledger`.
  5. **Rider Reconciliation:** (Covered in Section 19.4 - Rider Shift Reconciliation). `Rider` cash and container accountability is reconciled.
- **Key Entities:** `delivery_orders`, `sales_transactions`, `payments`, `containers`.
- **CRUD Modules:** Delivery Orders (CRUD - initiated, updated by Dispatcher/Rider).

## 20.3 Reseller / Dealer Sales

- **Objective:** Facilitate bulk sales to resellers and track consignment stock and commissions.
- **Process:**
  1. **Reseller Account Setup:** `Owner` or `Branch Manager` creates a `customer` record with `customer_type=\'reseller\'` and extends it into a `reseller` profile, defining `pricing_tier` and `commission_rate`.
  2. **Order Placement:**
     - `Reseller` places bulk orders via a dedicated web portal or by contacting the station.
     - System generates a `sales_transaction` for the bulk order, applying reseller-specific pricing.
  3. **Consignment (Optional):** If stock is provided on consignment:
     - `Inventory Staff` records `reseller_consignments`, specifying `product`, `quantity_consigned`.
     - `containers` given to the reseller have their `current_holder_type` set to `reseller`.
  4. **Payment & Billing:**
     - `Reseller` makes payments against their account, recorded in `payments` and `customer_ledger`.
     - System generates `customer_statements` periodically for resellers.
  5. **Commission Calculation:** System automatically calculates `commission` owed to `reseller` based on `sales_transactions` and configured `commission_rate`.
- **Key Entities:** `customers` (as resellers), `resellers`, `sales_transactions`, `reseller_consignments`, `payments`.
- **CRUD Modules:** Resellers (CRUD), Reseller Consignments (CRU), Commissions (Read-only generated).
