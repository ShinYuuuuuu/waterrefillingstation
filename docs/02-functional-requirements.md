# 2. Functional Requirements

Each requirement has a unique ID: `FR-<Module>-<Number>`. Priority: **M**ust, **S**hould, **C**ould (MoSCoW).

## 2.1 Authentication & Access Control

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-01 | System shall authenticate users via username/email + password. | M |
| FR-AUTH-02 | System shall support PIN-based quick re-authentication for POS cashier switching within a shift. | M |
| FR-AUTH-03 | System shall support optional MFA (TOTP or SMS OTP) for Owner/Accountant/Super Admin roles. | S |
| FR-AUTH-04 | System shall enforce RBAC per the permission matrix in `04-user-roles.md`. | M |
| FR-AUTH-05 | System shall lock an account after 5 consecutive failed login attempts for 15 minutes. | M |
| FR-AUTH-06 | System shall log all login/logout events with timestamp, IP, device. | M |
| FR-AUTH-07 | System shall support password reset via email/SMS verification. | M |
| FR-AUTH-08 | System shall support session expiration and forced logout after configurable inactivity period. | S |

## 2.2 POS / Sales Module

| ID | Requirement | Priority |
|---|---|---|
| FR-POS-01 | Cashier shall be able to add products to cart via button grid, search, or barcode scan. | M |
| FR-POS-02 | Cashier shall be able to attach a registered customer to a transaction or proceed as walk-in/guest. | M |
| FR-POS-03 | System shall calculate subtotal, discounts, tax, and total in real time as cart changes. | M |
| FR-POS-04 | System shall support split payments across multiple payment methods in one transaction. | M |
| FR-POS-05 | System shall compute change due for cash payments. | M |
| FR-POS-06 | Cashier shall be able to apply line-level or transaction-level discounts, subject to role-based limits and approval. | M |
| FR-POS-07 | System shall generate a sequential, non-editable Sales Invoice/Official Receipt number per transaction. | M |
| FR-POS-08 | System shall print a receipt to a connected thermal printer and/or send digital receipt via SMS/email. | M |
| FR-POS-09 | Cashier shall be able to hold/park an in-progress transaction and resume it later. | S |
| FR-POS-10 | Cashier/Manager shall be able to void a completed transaction with mandatory reason and (if above threshold) manager approval. | M |
| FR-POS-11 | System shall process returns/refunds referencing the original transaction. | M |
| FR-POS-12 | System shall track container exchange within a sale (empty containers received vs filled containers released) and update container ledger. | M |
| FR-POS-13 | System shall support shift open (starting cash count) and shift close (X-reading/Z-reading, cash reconciliation, variance report). | M |
| FR-POS-14 | POS shall operate offline, queuing transactions locally, and auto-sync to server when connectivity resumes. | M |
| FR-POS-15 | System shall prevent duplicate transaction submission on sync using idempotency keys. | M |

## 2.3 Delivery Module

| ID | Requirement | Priority |
|---|---|---|
| FR-DEL-01 | Staff shall be able to create a delivery order with customer, address, items, requested date/time. | M |
| FR-DEL-02 | System shall support recurring/standing orders with a defined frequency (e.g., every Monday). | S |
| FR-DEL-03 | Dispatcher shall assign orders to a rider and/or delivery route. | M |
| FR-DEL-04 | System shall provide a route/map view grouping orders by geographic area. | S |
| FR-DEL-05 | Rider app shall display assigned deliveries with customer info, address (map link), items, and payment due. | M |
| FR-DEL-06 | Rider shall update order status: Out for Delivery, Delivered, Failed (with reason), Returned. | M |
| FR-DEL-07 | Rider shall capture proof of delivery (photo and/or signature) upon completion. | M |
| FR-DEL-08 | Rider shall record payment collected (cash/e-wallet/COD) and empty containers picked up. | M |
| FR-DEL-09 | System shall notify customer of order status changes via SMS/push. | S |
| FR-DEL-10 | System shall support partial delivery/backorder when stock is insufficient. | C |
| FR-DEL-11 | System shall track rider's daily container load-out and reconcile against returns/deliveries/pickups at end of shift. | M |

## 2.4 Inventory & Container Module

| ID | Requirement | Priority |
|---|---|---|
| FR-INV-01 | Owner shall maintain a simplified catalog of water products and services with SKU, unit price, and unit of measure; quantities are entered on sale lines. | M |
| FR-INV-02 | System shall track stock levels per branch/warehouse with automatic deduction on sale and addition on production/purchase. | M |
| FR-INV-03 | System shall track shop-owned gallons as aggregate totals: total owned, at shop, in circulation, damaged, and lost; individual tag/QR tracking is not required. | M |
| FR-INV-04 | System shall record production batches (raw water input, output filled containers, batch date, operator, quality check result). | S |
| FR-INV-05 | System shall alert when stock falls below a configurable reorder threshold. | M |
| FR-INV-06 | System shall support stock transfer requests/approvals between branches/warehouses. | S |
| FR-INV-07 | System shall support scheduled physical stock counts with variance reporting and adjustment approval. | M |
| FR-INV-08 | System shall log equipment maintenance activities (filter change, RO membrane replacement) with due-date scheduling and alerts. | S |
| FR-INV-09 | System shall record stock write-offs (damage/loss/expiry) with reason and approval. | M |

## 2.5 Customer Management (CRM) Module

| ID | Requirement | Priority |
|---|---|---|
| FR-CRM-01 | System shall maintain customer profiles: name, contact numbers, addresses, customer type (retail/reseller/corporate). | M |
| FR-CRM-02 | System shall track container deposit balance per customer (containers currently held by the customer). | M |
| FR-CRM-03 | System shall support credit/utang accounts with a defined credit limit and running balance. | M |
| FR-CRM-04 | System shall block or warn on new credit sales when a customer exceeds their credit limit. | M |
| FR-CRM-05 | System shall maintain full purchase/order history per customer. | M |
| FR-CRM-06 | System shall support a loyalty points program: point accrual rules, redemption, tier levels. | S |
| FR-CRM-07 | System shall support customer tagging/segmentation for targeted promotions. | C |
| FR-CRM-08 | System shall log customer complaints/feedback with status tracking (open/resolved). | S |
| FR-CRM-09 | System shall trigger promotional notifications on customer birthdays/anniversaries. | C |

## 2.6 Reseller/Dealer Module

| ID | Requirement | Priority |
|---|---|---|
| FR-RES-01 | System shall support reseller accounts with distinct wholesale pricing tiers. | S |
| FR-RES-02 | System shall support bulk order entry for resellers. | S |
| FR-RES-03 | System shall track consigned containers/stock placed with a reseller and reconcile on settlement. | C |
| FR-RES-04 | System shall compute commission owed to resellers/agents based on configurable rules. | C |

## 2.7 Payments & Billing Module

| ID | Requirement | Priority |
|---|---|---|
| FR-PAY-01 | System shall record payments across methods: cash, GCash, Maya, bank transfer, card, check. | M |
| FR-PAY-02 | System shall support partial payments and track outstanding balance per invoice. | M |
| FR-PAY-03 | System shall generate periodic account statements for credit customers. | M |
| FR-PAY-04 | System shall generate a collections aging report (current, 30/60/90+ days overdue). | M |
| FR-PAY-05 | System shall handle container deposit collection and refund upon container return/account closure. | M |
| FR-PAY-06 | System shall generate BIR-compliant sequential Sales Invoices/Official Receipts. | M |
| FR-PAY-07 | System shall reconcile recorded e-wallet/bank payments against external statements (manual or API-based). | S |
| FR-PAY-08 | System shall send payment due/overdue reminders to customers automatically. | S |

## 2.8 Reporting & Dashboard Module

| ID | Requirement | Priority |
|---|---|---|
| FR-RPT-01 | System shall provide a role-specific dashboard with real-time KPIs (see `14-dashboard-widgets.md`). | M |
| FR-RPT-02 | System shall generate the full report catalog defined in `15-reports.md`, filterable by date range and branch. | M |
| FR-RPT-03 | System shall export reports to PDF, Excel, and CSV. | M |
| FR-RPT-04 | System shall support scheduled report generation and email delivery. | S |
| FR-RPT-05 | Owner shall be able to compare performance across branches. | M |

## 2.9 Notification Module

| ID | Requirement | Priority |
|---|---|---|
| FR-NOT-01 | System shall provide an in-app notification center per user. | M |
| FR-NOT-02 | System shall send SMS/push notifications per the catalog in `16-notifications.md`. | M |
| FR-NOT-03 | System shall retry failed notification deliveries with a dead-letter queue after max retries. | S |
| FR-NOT-04 | Users shall be able to configure notification preferences (channel, on/off) where applicable. | C |

## 2.10 Administration Module

| ID | Requirement | Priority |
|---|---|---|
| FR-ADM-01 | Owner/Super Admin shall manage branches, users, and roles. | M |
| FR-ADM-02 | System shall maintain an immutable audit log of all sensitive actions. | M |
| FR-ADM-03 | System shall perform automated scheduled backups with restore capability. | M |
| FR-ADM-04 | Owner shall configure business rules: pricing, discounts, tax rates, deposit amounts, credit limits, loyalty rules. | M |
| FR-ADM-05 | System shall support data export for migration/backup purposes in open formats (CSV/JSON). | S |
