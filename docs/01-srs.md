# 1. Software Requirements Specification (SRS)

## 1.1 Introduction

### 1.1.1 Purpose
This SRS defines the requirements for the **Water Station Management System (WSMS)**, a business management platform for water refilling station operators covering point-of-sale, delivery logistics, inventory/container tracking, customer relationship management, billing/collections, and reporting.

### 1.1.2 Scope
The system shall support:
- Single-branch and multi-branch (franchise/HQ) deployments.
- Counter (walk-in) POS operations, offline-capable.
- Delivery/dispatch operations with a rider mobile application.
- Container (gallon) asset tracking as a company-owned deposit-based asset.
- Customer relationship management including credit/utang accounts and loyalty.
- Reseller/dealer bulk sales channel.
- Financial reporting suitable for informing tax filing (not a replacement for official accounting/BIR software, but exportable to one).

### 1.1.3 Intended Audience
Software engineers, QA engineers, project managers, and station business stakeholders who will build, test, and validate the system from this specification.

### 1.1.4 Definitions & Acronyms
| Term | Meaning |
|---|---|
| WSMS | Water Station Management System |
| POS | Point of Sale |
| SKU | Stock Keeping Unit |
| RO | Reverse Osmosis (water filtration stage) |
| COD | Cash on Delivery |
| OR | Official Receipt |
| SI | Sales Invoice |
| RBAC | Role-Based Access Control |
| HQ | Headquarters (multi-branch owner account) |
| Container/Gallon | Reusable 5-gallon (or other size) water bottle, a trackable company asset |

## 1.2 Overall Description

### 1.2.1 Product Perspective
WSMS is a standalone, self-contained system (not dependent on external POS/accounting platforms), but exposes APIs/webhooks for optional integration with accounting software (e.g., QuickBooks-equivalent), SMS gateways, e-wallet payment APIs (GCash/Maya), and mapping services (for delivery routing).

### 1.2.2 Product Functions (Summary)
1. Sales processing (walk-in & delivery)
2. Delivery dispatch & rider management
3. Inventory & container asset tracking
4. Customer relationship management
5. Payments & billing/collections
6. Reporting & analytics dashboard
7. Multi-branch administration
8. Notifications & alerts
9. System configuration & settings

### 1.2.3 User Classes
See `04-user-roles.md` for full role catalog: Super Admin, Owner, Branch Manager, Cashier, Inventory Staff, Rider, Dispatcher, Accountant, Reseller, Customer, Technician.

### 1.2.4 Operating Environment
- **Backend:** Runs on a cloud VPS or on-premise server; Linux-based.
- **Database:** Relational database (PostgreSQL recommended for ACID compliance on financial data).
- **Client:** Web browser (desktop/tablet) for admin/POS; native or hybrid mobile app (Android priority) for rider and customer apps.
- **Connectivity:** Must operate with intermittent internet (offline-first POS/rider apps with sync).
- **Peripherals:** Thermal receipt printer, barcode/QR scanner, cash drawer, optional weighing/dispensing IoT sensors (future).

### 1.2.5 Design & Implementation Constraints
- Must support at least 3 years of transactional history without significant performance degradation.
- Must comply with local tax invoice numbering rules (sequential, non-reusable).
- Must protect customer PII per data privacy regulations.
- Must be branch-data-isolated (a branch manager cannot see another branch's data) while HQ Owner sees consolidated view.

### 1.2.6 Assumptions & Dependencies
- Station has at least one internet-connected device for daily sync/reporting even if POS runs offline intra-day.
- SMS/e-wallet gateway accounts are provisioned by the station owner (system integrates, does not own these accounts).

## 1.3 System Features (High-Level Functional Groups)

1. **Authentication & Access Control** — login, MFA, RBAC, session/shift management.
2. **POS / Sales Module** — cart, payment, receipts, void/refund, shift reconciliation.
3. **Delivery Module** — order intake, dispatch, rider app, proof of delivery, route management.
4. **Inventory Module** — product catalog, stock ledger, container asset tracking, production batches, stock transfer, stock count.
5. **CRM Module** — customer profiles, credit accounts, loyalty, complaints.
6. **Reseller Module** — dealer accounts, bulk pricing, consignment, commissions.
7. **Billing & Payments Module** — payment recording, statements, collections, reconciliation.
8. **Reporting & Dashboard Module** — KPI dashboard, report catalog, scheduled reports, export.
9. **Notification Module** — SMS/push/email alerts, in-app notification center.
10. **Administration Module** — branch/user/role management, settings, audit log, backups.

Each is elaborated in `02-functional-requirements.md`.

## 1.4 External Interface Requirements

### 1.4.1 User Interfaces
See `12-ui-sitemap.md` for full screen inventory.

### 1.4.2 Hardware Interfaces
- Thermal printers (ESC/POS protocol, USB/Bluetooth/Network).
- Barcode/QR scanners (USB HID or camera-based scanning on mobile).
- Cash drawer (RJ11 trigger via printer).

### 1.4.3 Software Interfaces
- SMS Gateway API (e.g., Semaphore, Twilio-equivalent).
- E-wallet payment APIs (GCash, Maya) for payment confirmation webhooks.
- Mapping/geocoding API (Google Maps or OpenStreetMap) for delivery routing.
- Cloud object storage for backups, receipts, proof-of-delivery photos.

### 1.4.4 Communication Interfaces
- HTTPS/TLS 1.2+ for all client-server communication.
- WebSocket or push notification service for real-time order status updates.

## 1.5 Non-Functional Requirements Summary
Detailed in `03-non-functional-requirements.md`: performance, availability, scalability, security, usability, maintainability, portability, compliance.

## 1.6 Other Requirements
- **Data migration**: Ability to import legacy customer/product data via CSV.
- **Localization**: Support for English and Filipino (Tagalog) UI strings at minimum, currency formatting for PHP (₱).
- **Print templates**: Configurable receipt/invoice templates per branch (logo, address, TIN).
