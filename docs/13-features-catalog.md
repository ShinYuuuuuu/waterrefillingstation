# 13. Complete Feature Catalog

This catalog lists every visible (customer/staff-facing) feature and every hidden (backend/operational) feature required for a commercially viable Water Station Management System.

## 13.1 Visible Features (User-Facing)

### A. Point of Sale (Counter/Walk-in)
- Quick-sale screen with product grid (buttons for common items: refill, new gallon, dispenser, accessories)
- Barcode/QR scan for products and container tags
- Cart management (add/remove/edit line item, quantity, discount per line)
- Customer lookup/attach to sale (optional for walk-in)
- Multiple payment methods per transaction (split payment: cash + e-wallet)
- Change computation
- Discounts: senior citizen/PWD, promo codes, loyalty discounts, manual discount (with approval)
- Receipt printing (thermal 58mm/80mm) and/or SMS/email e-receipt
- Void/cancel transaction (with reason + approval)
- Return/refund processing
- Hold/park transaction (resume later)
- Open/close cash drawer
- Daily cash count & shift open/close (X-reading, Z-reading)
- Offline mode with local queue and auto-sync

### B. Delivery / Order Management
- Create delivery order (phone-in, walk-in scheduled, app-based)
- Standing order / subscription (recurring weekly delivery)
- Assign order to rider/route
- Delivery scheduling & calendar view
- Route optimization / grouping by area
- Rider mobile app: assigned deliveries list, navigation link, mark delivered/failed, collect payment, capture proof of delivery (photo/signature)
- Real-time order status tracking (Pending → Assigned → Out for Delivery → Delivered/Failed → Returned)
- Customer-facing order status notification (SMS/Viber/Messenger/app push)
- Empty container pickup tracking during delivery
- Partial delivery / backorder handling

### C. Customer Portal / Ordering App (optional channel)
- Self-service ordering (web/mobile)
- Order history & reorder
- Account balance / credit view
- Loyalty points balance
- Address book (multiple delivery addresses)
- Push/SMS notifications for order status and promos

### D. Inventory & Container Management
- Product catalog (finished goods, raw materials, containers, accessories)
- Container/gallon tracking by unique tag/QR (company asset ledger)
- Container deposit management (customer holds X containers as deposit)
- Stock in/out ledger (production, purchase, sales, damage, loss)
- Low-stock alerts and reorder suggestions
- Raw material tracking (filters, caps, seals, labels, chemicals)
- Machine/equipment maintenance schedule (filter replacement, RO membrane change)
- Production batch logging (water purification runs, output quantity, quality check)
- Stock transfer between branches/warehouses
- Physical inventory count / stock take & variance reconciliation

### E. Customer Management (CRM)
- Customer profile (name, contact, addresses, type: retail/reseller/corporate)
- Container deposit balance per customer
- Credit/utang account with credit limit
- Purchase history
- Loyalty program (points, tiers, rewards redemption)
- Customer segmentation & tagging
- Complaint/feedback logging
- Birthday/anniversary promo triggers

### F. Sales & Reseller/Dealer Management
- Reseller/dealer accounts with special pricing tiers
- Bulk order processing for resellers
- Consignment tracking (containers/stock placed with resellers)
- Commission computation for resellers/agents/riders

### G. Payments & Billing
- Multi-channel payment recording (cash, GCash, Maya, bank transfer, card, check)
- On-account/credit billing with statement generation
- Partial payments & installment tracking
- Collections management (aging report, follow-up reminders)
- Deposit/refund handling for containers
- Invoice/Official Receipt/Sales Invoice generation (BIR-compliant sequential numbering)
- Payment reconciliation with bank/e-wallet statements

### H. Reports & Analytics
- Sales reports (daily/weekly/monthly, by branch, by product, by cashier, by payment method)
- Inventory reports (stock levels, movement, wastage, shrinkage)
- Container reports (in circulation, with customers, lost/damaged)
- Delivery performance reports (on-time rate, per rider)
- Customer reports (top customers, inactive customers, credit exposure)
- Financial reports (profit & loss summary, cash flow, collectibles/aging)
- Tax reports (VAT summary, sales/purchase books)
- Custom report builder / export (PDF, Excel, CSV)

### I. Dashboard
- Sales KPIs (today/week/month vs target)
- Cash position summary
- Container circulation summary
- Delivery status board
- Low-stock alerts widget
- Top products/customers widget
- Branch comparison (multi-branch owners)

### J. Notifications
- Low stock alert
- Order status updates (customer)
- Payment due/overdue reminders
- Delivery assignment alerts (rider)
- Approval requests (voids, discounts, refunds)
- System alerts (backup failure, sync failure, machine maintenance due)

## 13.2 Hidden / Backend Features (Non-Obvious but Required Commercially)

- **Audit trail / activity log** — every create/update/delete/void/login tracked with user, timestamp, before/after values.
- **Role-based access control (RBAC)** with granular permissions.
- **Multi-branch data isolation** with HQ roll-up reporting.
- **Automated database backups** (scheduled, offsite/cloud) and restore capability.
- **Offline-first sync engine** with conflict resolution strategy.
- **Sequential, tamper-evident invoice/receipt numbering** for tax compliance (BIR Z-reading/X-reading equivalent).
- **Void/adjustment approval workflow** requiring supervisor PIN/override.
- **Session/shift management** tied to cashier accountability and cash reconciliation.
- **Rate limiting & brute-force protection** on login endpoints.
- **Data encryption at rest and in transit** for PII and payment data.
- **Configurable business rules engine** (pricing tiers, discount rules, credit limits, deposit amounts) editable without code changes.
- **Multi-currency/tax configuration** (VAT-inclusive/exclusive toggle, tax rates per branch/region).
- **Automated recurring billing job** for standing orders/subscriptions.
- **Dead-letter/retry queue** for failed notification deliveries (SMS/push).
- **Idempotency keys** on payment and order creation APIs to prevent duplicate transactions.
- **Soft-delete** pattern (no hard deletes on transactional data) for auditability.
- **Data export/anti-lock-in tooling** (full data export in open formats).
- **License/subscription management** for the software vendor's own SaaS billing to station owners (if multi-tenant SaaS).
- **Tenant provisioning & onboarding workflow** (multi-tenant SaaS deployments).
- **Health-check/monitoring endpoints** and error tracking integration.
- **Feature flags** for gradual rollout of new modules.
- **Printer/hardware abstraction layer** supporting multiple thermal printer brands/protocols.
- **Barcode/QR generation service** for new container tags and product labels.
- **Report scheduling & auto-email delivery** (e.g., daily sales report emailed to owner at 9PM).
- **Data retention & archival policy** (archive transactions older than N years, purge per privacy law).
- **Terms & conditions / e-signature capture** for reseller/credit agreements.
- **Webhook system** for third-party integrations (accounting software, e-wallet APIs).
- **API rate limiting and API key management** for external integrations (e.g., customer ordering app).
- **Geofencing/GPS tracking** for delivery riders (route compliance, ETA calculation).
- **Fraud detection heuristics** (unusual void patterns, discount abuse, negative inventory).
