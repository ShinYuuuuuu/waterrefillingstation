# 4. User Roles & Permissions Matrix

## 4.1 Role List

| Role | Description |
|------|--------------|
| **Super Admin** (Vendor) | Software provider's own staff; manages tenant provisioning, licensing, global system health (only in multi-tenant SaaS deployment). |
| **Owner / Business Admin** | Owns one or more station branches; full access to all branches, financials, settings. |
| **Branch Manager** | Manages a single branch: staff, inventory, pricing (within limits), approvals. |
| **Cashier / Counter Staff** | Operates POS, processes walk-in sales, handles cash drawer/shift. |
| **Inventory/Warehouse Staff** | Manages stock in/out, production logging, stock transfers, stock counts. |
| **Rider / Delivery Personnel** | Uses mobile app to view assigned deliveries, update status, collect payment. |
| **Dispatcher / Delivery Coordinator** | Assigns orders to riders, manages routes and schedules. |
| **Accountant / Bookkeeper** | Views financial reports, manages billing/collections, reconciles payments, generates tax reports. |
| **Reseller / Dealer** (external portal user) | Places bulk orders, views own account balance and order history. |
| **Customer** (external portal/app user) | Places orders, views order history, account/loyalty balance. |
| **Technician** | Logs equipment maintenance, filter changes, machine downtime. |

## 4.2 Permission Matrix

Legend: **C**reate, **R**ead, **U**pdate, **D**elete, **A**pprove, **X** = no access

| Module | Super Admin | Owner | Branch Mgr | Cashier | Inventory Staff | Rider | Dispatcher | Accountant | Reseller | Customer |
|---|---|---|---|---|---|---|---|---|---|---|
| Tenant/License Mgmt | CRUD | X | X | X | X | X | X | X | X | X |
| Branch Settings | R | CRUD | RU (limited) | X | X | X | X | R | X | X |
| POS / Sales | X | R | R | CRU | X | X | X | R | X | X |
| Void/Refund | X | A | A | C (needs A) | X | X | X | R | X | X |
| Delivery Orders | X | R | CRUD | R (own) | X | RU (own) | CRUD | R | X | CR (own) |
| Inventory/Containers | X | R | RU | R | CRUD | RU (own load) | R | R | X | X |
| Customer/CRM | X | RUD | CRUD | CR | R | R (own route) | R | R | R (own) | RU (own) |
| Reseller Mgmt | X | CRUD | RU | X | X | X | X | R | R (own) | X |
| Payments/Billing | X | RUD | RU | C | X | C (COD collect) | X | CRUD | R (own) | R (own) |
| Reports | R (system) | CRUD | R (branch) | R (own shift) | R (inventory) | R (own) | R (delivery) | CRUD | R (own) | X |
| Users/Roles | CRUD (vendor) | CRUD | CRU (branch staff) | X | X | X | X | X | X | X |
| Maintenance Logs | X | R | CRU | X | CRU | X | X | X | X | X |
| Notifications Config | X | CRUD | RU | X | X | X | X | X | X | X |
| Audit Log | R (system) | R | R (branch) | X | X | X | X | R | X | X |

## 4.3 Authentication Method by Role

- **Owner/Branch Mgr/Accountant/Cashier/Inventory/Dispatcher/Technician**: Email/username + password, optional PIN for quick POS re-auth, MFA optional for Owner/Accountant.
- **Rider**: Mobile app login via phone number + OTP or PIN.
- **Customer/Reseller**: Mobile number/email + OTP, or password with social login option.
- **Super Admin**: Email + password + mandatory MFA.

## 4.4 Approval Hierarchy

- Cashier-initiated voids/refunds/manual discounts above threshold require **Branch Manager** or **Owner** approval (PIN-based override captured in audit log).
- Credit limit increase for customers requires **Owner** approval.
- Stock write-off/damage adjustments require **Branch Manager** approval.
