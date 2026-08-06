# 6. Use Case Specifications

Key use cases detailed with actors, preconditions, main flow, alternate flows, and postconditions.

## UC-01: Process Walk-in Sale with Container Exchange

- **Actors:** Cashier (primary), Customer
- **Preconditions:** Cashier is logged in with an open shift. Products/containers are in stock.
- **Main Flow:**
  1. Cashier starts a new sale.
  2. Cashier scans/selects products (e.g., "Refill 5-Gallon x2").
  3. System prompts for container exchange: empty containers received count.
  4. Cashier optionally attaches a registered customer.
  5. System computes subtotal, applicable discounts, and total.
  6. Cashier selects payment method(s) and enters amount tendered.
  7. System computes change, finalizes transaction, assigns sequential invoice number.
  8. System deducts filled-container stock, increments empty-container stock, updates customer container balance (if attached).
  9. System prints/sends receipt.
- **Alternate Flows:**
  - 3a. Customer has insufficient empty containers to exchange → system charges deposit for the shortfall (configurable).
  - 6a. Insufficient stock → system blocks sale or offers backorder/delivery option.
  - 6b. Split payment → cashier enters multiple payment method amounts totaling the sale total.
- **Postconditions:** Sale recorded, inventory updated, receipt issued, invoice number consumed sequentially.

## UC-02: Void a Completed Transaction

- **Actors:** Cashier, Branch Manager (approver)
- **Preconditions:** Transaction exists and is within the allowed void window (e.g., same shift/day).
- **Main Flow:**
  1. Cashier selects transaction to void and enters a reason.
  2. System checks void amount against cashier's approval threshold.
  3. If above threshold, system requests Branch Manager PIN/approval.
  4. Manager approves (or denies) via PIN entry.
  5. System reverses inventory movements tied to the transaction, marks transaction as VOID (not deleted), logs the action in the audit trail.
- **Alternate Flows:**
  - 4a. Manager denies → void request rejected, transaction remains active, event logged.
- **Postconditions:** Transaction marked void, inventory restored, audit entry created.

## UC-03: Create and Fulfill a Delivery Order

- **Actors:** Counter Staff/Dispatcher, Rider, Customer
- **Preconditions:** Customer profile exists (or created inline); stock available or backorder acceptable.
- **Main Flow:**
  1. Staff creates delivery order: customer, address, items, requested date/time, payment method (cash/COD/on-account).
  2. Dispatcher assigns order to a rider/route.
  3. Rider app shows the order in the day's manifest.
  4. Rider departs; marks order "Out for Delivery."
  5. Rider arrives, delivers items, collects empty containers, collects payment (if COD), captures proof of delivery.
  6. Rider marks order "Delivered."
  7. System updates inventory (rider's carried stock decremented), customer container balance, and payment/billing records.
  8. System notifies customer of delivery completion.
- **Alternate Flows:**
  - 5a. Customer not available → rider marks "Failed" with reason; dispatcher reschedules.
  - 5b. Customer pays via on-account/credit → system adds to customer's outstanding balance instead of collecting cash.
- **Postconditions:** Order status finalized, inventory and billing records updated, customer notified.

## UC-04: Manage Container Deposit Lifecycle

- **Actors:** Cashier/Rider, Customer, System
- **Preconditions:** Container tracking is enabled; container has a unique tag/QR.
- **Main Flow:**
  1. New customer receives filled container(s) without returning empties → system charges a deposit and records container(s) as "with customer" against that customer's account.
  2. On subsequent visits, customer returns empty containers matching the deposit count → no additional deposit charged, containers exchanged 1:1.
  3. Customer requests deposit refund and returns all held containers → system verifies count, refunds deposit amount, closes out balance.
- **Alternate Flows:**
  - 1a. Customer returns fewer empties than filled containers taken → deposit charged for the difference.
  - 3a. Container reported lost/damaged → no refund for that unit; container status set to "lost/damaged" and removed from active asset count.
- **Postconditions:** Customer's container balance and company container asset ledger remain reconciled at all times.

## UC-05: Physical Stock Count & Variance Reconciliation

- **Actors:** Inventory Staff, Branch Manager (approver)
- **Preconditions:** A stock count session is scheduled/initiated.
- **Main Flow:**
  1. Inventory Staff initiates a stock count session for selected SKUs/containers.
  2. System freezes "book" quantity snapshot.
  3. Staff physically counts and enters actual quantities (or scans containers individually).
  4. System calculates variance (book vs. actual) per item.
  5. Staff submits count; Branch Manager reviews and approves adjustment.
  6. System posts inventory adjustment entries referencing the count session.
- **Postconditions:** Stock levels reflect actual counts; variance report archived for audit.

## UC-06: Credit Sale with Credit Limit Enforcement

- **Actors:** Cashier/Rider, System, Branch Manager (override approver)
- **Preconditions:** Customer has an active credit/utang account with a defined credit limit.
- **Main Flow:**
  1. Customer requests to bill the sale to their account instead of paying cash.
  2. System checks customer's current outstanding balance + new sale amount against credit limit.
  3. If within limit, system posts sale as receivable against the customer account.
  4. If exceeding limit, system blocks the transaction and prompts for Branch Manager override.
- **Alternate Flows:**
  - 4a. Manager approves override → sale proceeds; incident logged in audit trail with justification.
- **Postconditions:** Customer balance updated; statement will reflect the new charge.

## UC-07: Generate and Send Collections Reminder

- **Actors:** System (automation), Accountant
- **Preconditions:** Customer has an overdue outstanding balance past the configured grace period.
- **Main Flow:**
  1. Scheduled job scans customer accounts for overdue balances daily.
  2. System generates a reminder notification (SMS/email) referencing the amount due and due date.
  3. System logs the reminder sent in the customer's communication history.
  4. Accountant can view the aging report and manually trigger additional reminders or escalate.
- **Postconditions:** Customer notified; reminder logged; aging report reflects updated status.

## UC-08: Multi-Branch Stock Transfer

- **Actors:** Inventory Staff (origin branch), Inventory Staff (destination branch), Branch Manager (approver)
- **Preconditions:** Both branches exist under the same tenant; stock available at origin.
- **Main Flow:**
  1. Origin Inventory Staff creates a transfer request specifying destination branch, items/containers, and quantity.
  2. Branch Manager approves the outgoing transfer.
  3. System deducts stock from origin branch (status: "in transit").
  4. Destination Inventory Staff confirms receipt upon arrival.
  5. System adds stock to destination branch, closing the transfer.
- **Alternate Flows:**
  - 4a. Received quantity differs from sent quantity → discrepancy logged, requires manager review.
- **Postconditions:** Stock ledgers at both branches accurately reflect the transfer.

## UC-09: Offline POS Transaction and Sync

- **Actors:** Cashier, System (sync engine)
- **Preconditions:** POS device has no internet connectivity.
- **Main Flow:**
  1. Cashier processes a sale as normal; system stores transaction locally with a generated idempotency key and "pending sync" flag.
  2. Local receipt is printed from cached data.
  3. When connectivity is restored, sync engine transmits queued transactions to the server.
  4. Server validates idempotency key to prevent duplicates, applies inventory/financial updates, and returns confirmation.
  5. Local device marks transaction as "synced."
- **Alternate Flows:**
  - 4a. Conflict detected (e.g., stock went negative due to concurrent offline sales at another terminal) → transaction flagged for manual review rather than silently failing.
- **Postconditions:** All offline transactions eventually reconciled server-side; no duplicate or lost transactions.

## UC-10: Rider Shift Container Reconciliation

- **Actors:** Rider, Dispatcher
- **Preconditions:** Rider has an open delivery shift with a recorded starting container load-out.
- **Main Flow:**
  1. Rider loads out N filled containers at shift start (recorded by dispatcher/system).
  2. Throughout the day, deliveries decrement filled containers and increment empty containers picked up.
  3. At shift end, rider returns to base; dispatcher counts remaining filled containers and collected empties.
  4. System reconciles: load-out − delivered − remaining should equal zero; empties collected should match expected pickups.
- **Alternate Flows:**
  - 4a. Discrepancy found → flagged for investigation, may require rider explanation logged in system.
- **Postconditions:** Rider's daily container accountability closed and archived.
