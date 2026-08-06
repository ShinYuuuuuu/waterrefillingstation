# Water Station Management System (WSMS) — Executive Overview

## 1. Purpose

This document set is a complete Software Requirements Specification (SRS) package for a commercial-grade **Water Station Management System (WSMS)** — a business application used by purified/mineral water refilling stations to manage sales, delivery, inventory, customers, payments, and operations.

> **Note on source material:** No reference file/image was attached to this task. This specification is reverse-engineered from the standard feature set of commercial Philippine/Southeast Asian water refilling station POS & delivery management systems (the dominant product category in this domain, e.g. "Purified Water Station POS", "Aqua/HydroFlow Station Manager"-type products). All features below reflect what such systems universally implement, plus commercially-necessary hidden/backend features a real product requires (audit trails, backups, multi-branch support, etc.).

## 2. Product Summary

The WSMS is a **multi-branch, multi-role, offline-capable Point-of-Sale (POS) and back-office management system** for water refilling stations that sell:

- Refilled purified/mineral water (round trip: empty container in, filled container out)
- New water containers/gallons (round, slim, 5-gallon, distilled, alkaline, etc.)
- Water dispensers, accessories, hose/faucets, and related products
- Delivery services (walk-in counter sales + home/office delivery + subscription/standing orders)

## 3. Core Business Model Being Modeled

1. **Walk-in sales** at the station counter (customer brings empty container, pays, gets filled container).
2. **Delivery sales** — customer calls/orders via app, rider delivers filled containers and picks up empties, collects payment (cash/GCash/COD) or bills to account.
3. **Container/Bottle deposit management** — containers are company-owned assets; customers borrow/exchange them; deposits and container-tracking are core to inventory.
4. **Refill production tracking** — raw water is purified through machine stages (sediment filter → carbon filter → RO membrane → UV/ozone) and tracked as production output/inventory.
5. **Reseller/Dealer network** — bulk sales to satellite resellers who resell to end customers.
6. **Multi-branch franchise operations** — headquarter oversight of multiple station branches.

## 4. Document Index

| # | Document | Description |
|---|----------|-------------|
| 1 | `01-srs.md` | Full Software Requirements Specification |
| 2 | `02-functional-requirements.md` | Functional requirements by module |
| 3 | `03-non-functional-requirements.md` | Performance, security, scalability, compliance |
| 4 | `04-user-roles.md` | Roles, permissions matrix |
| 5 | `05-user-stories.md` | User stories per role |
| 6 | `06-use-cases.md` | Detailed use case specifications |
| 7 | `07-database-design.md` | Full relational schema (tables, columns, constraints) |
| 8 | `08-erd.md` | Entity-Relationship Diagram (Mermaid) + relationship catalog |
| 9 | `09-folder-architecture.md` | Codebase/project folder structure |
| 10 | `10-api-design.md` | REST API specification |
| 11 | `11-security-design.md` | AuthN/AuthZ, data protection, threat model |
| 12 | `12-ui-sitemap.md` | Screen inventory & navigation map |
| 13 | `13-features-catalog.md` | Complete visible + hidden feature catalog |
| 14 | `14-dashboard-widgets.md` | Dashboard widget specifications |
| 15 | `15-reports.md` | Report catalog & specifications |
| 16 | `16-notifications.md` | Notification/alert catalog |
| 17 | `17-automations-workflows.md` | Automations and business workflows |
| 18 | `18-inventory-process.md` | Inventory & container/asset management |
| 19 | `19-delivery-process.md` | Delivery & logistics process |
| 20 | `20-sales-process.md` | Sales (POS, delivery, reseller) process |
| 21 | `21-customer-management.md` | CRM process |
| 22 | `22-payment-process.md` | Payments, billing, collections |
| 23 | `23-settings-modules.md` | System configuration/settings modules |

## 5. Assumptions & Constraints

- System must support **offline-first POS** at the counter (unreliable internet in many station locations) with background sync.
- System must support **multi-branch** deployments reporting to a central HQ/owner dashboard.
- System must be usable on **low-cost Android tablets/phones** (riders, counter staff) as well as desktop browsers (admin/owner).
- Must integrate with **local payment channels**: cash, GCash, Maya, bank transfer, credit/utang (on-account billing).
- Must support **thermal receipt printing** (58mm/80mm) and **barcode/QR scanning** for containers and products.
- Data privacy must comply with **Data Privacy Act (RA 10173)** equivalent / general PII protection best practices.
