# 12. UI Sitemap

This document outlines the user interface (UI) sitemap for the Water Station Management System (WSMS), detailing the main screens and their navigation paths for different user roles. It covers the web-based administrative/POS interfaces and the mobile applications for riders and customers.

## 12.1 Web Application (Admin / POS / Dispatcher)

```mermaid
graph TD
    A[Login Page] --> B{Dashboard}

    B --> B1[Owner/Admin Dashboard]
    B --> B2[Branch Manager Dashboard]
    B --> B3[Dispatcher Dashboard]
    B --> B4[Accountant Dashboard]
    B --> B5[Inventory Dashboard]

    %% Admin/Owner Modules
    B1 --> C1[Branch Management]
    C1 --> C1.1[Branch Details]
    C1 --> C1.2[Branch Settings]

    B1 --> C2[User & Role Management]
    C2 --> C2.1[User List]
    C2 --> C2.2[Role & Permissions Matrix]

    B1 --> C3[Global Settings]
    C3 --> C3.1[Business Rules (Pricing, Discounts)]
    C3 --> C3.2[System Configuration]
    C3 --> C3.3[Integrations]

    B1 --> C4[Audit Log]
    B1 --> C5[Backup & Restore]

    %% POS Module
    B2 --- D1[POS - Quick Sale Screen]
    B3 --- D1
    D1 --> D1.1[Cart Management]
    D1 --> D1.2[Customer Search/Attach]
    D1 --> D1.3[Payment Processing]
    D1 --> D1.4[Receipt Printing]
    D1 --> D1.5[Hold/Resume Transaction]
    D1 --> D1.6[Void/Refund Transaction (Approval Flow)]
    D1 --> D1.7[Shift Management (Open/Close)]

    %% Delivery Management (Dispatcher)
    B3 --> E1[Delivery Order List]
    E1 --> E1.1[Create New Delivery Order]
    E1 --> E1.2[Order Details (Status, Rider, Map)]
    E1 --> E1.3[Assign Rider / Route]
    E1 --> E1.4[Standing Orders Management]

    B3 --> E2[Delivery Route Optimization View]
    E2 --> E2.1[Map View with Orders]
    E2 --> E2.2[Route Assignment Tool]

    %% Inventory Management
    B2 --- F1[Product Catalog]
    B5 --- F1
    F1 --> F1.1[Product Details (SKU, Price, Type)]
    F1 --> F1.2[Categories Management]

    B2 --- F2[Current Stock Levels]
    B5 --- F2
    F2 --> F2.1[Stock Movement History]
    F2 --> F2.2[Low Stock Alerts]

    B5 --> F3[Container Tracking]
    F3 --> F3.1[Container Asset List (by Tag/QR)]
    F3 --> F3.2[Container Holder History]
    F3 --> F3.3[Damage/Loss Reporting]

    B5 --> F4[Production Batches]
    F4 --> F4.1[Record New Batch]
    F4 --> F4.2[Batch History & QC]

    B5 --> F5[Stock Transfers]
    F5 --> F5.1[Create Transfer Request]
    F5 --> F5.2[Receive Transfer]
    F5 --> F5.3[Transfer History]

    B5 --> F6[Physical Stock Count]
    F6 --> F6.1[Start New Count Session]
    F6 --> F6.2[Count Entry & Variance]
    F6 --> F6.3[Count Approval]

    B5 --> F7[Equipment & Maintenance]
    F7 --> F7.1[Equipment List]
    F7 --> F7.2[Maintenance Schedule]
    F7 --> F7.3[Log Maintenance]

    %% Customer Relationship Management (CRM)
    B2 --- G1[Customer List]
    B3 --- G1
    G1 --> G1.1[Customer Profile (Contact, Addresses)]
    G1 --> G1.2[Purchase History]
    G1 --> G1.3[Container Deposit Balance]
    G1 --> G1.4[Credit/Utang Account & Limit]
    G1 --> G1.5[Loyalty Points]
    G1 --> G1.6[Customer Tags/Segmentation]
    G1 --> G1.7[Complaint Management]

    B2 --- G2[Reseller/Dealer Management]
    B1 --- G2
    G2 --> G2.1[Reseller List & Pricing Tiers]
    G2 --> G2.2[Consignment Tracking]
    G2 --> G2.3[Commission Reports]

    %% Payments & Billing
    B2 --- H1[Payment History]
    B4 --- H1
    H1 --> H1.1[Record New Payment]
    H1 --> H1.2[Payment Reconciliation]

    B4 --> H2[Customer Statements]
    H2 --> H2.1[Generate Statement]
    H2 --> H2.2[Statement History]

    B4 --> H3[Collections / Aging Report]
    H3 --> H3.1[Overdue Account List]
    H3 --> H3.2[Send Reminders]

    %% Reports & Analytics
    B1 --- I1[Reports Center]
    B2 --- I1
    B3 --- I1
    B4 --- I1
    B5 --- I1
    I1 --> I1.1[Sales Reports]
    I1 --> I1.2[Inventory Reports]
    I1 --> I1.3[Delivery Performance Reports]
    I1 --> I1.4[Customer Reports]
    I1 --> I1.5[Financial Reports]
    I1 --> I1.6[Export Functionality (PDF/Excel/CSV)]
    I1 --> I1.7[Scheduled Reports Management]

    B --> J1[Notifications Center (In-app)]
    J1 --> J1.1[Notification Preferences]

    B --> K1[Profile & Security Settings (My Account)]
    K1 --> K1.1[Change Password/PIN]
    K1 --> K1.1[MFA Settings]
```

## 12.2 Mobile Rider Application

```mermaid
graph TD
    L[Rider Login] --> M[Rider Dashboard]

    M --> M1[Assigned Deliveries List]
    M1 --> M1.1[Delivery Order Details]
    M1.1 --> M1.1.1[Customer Info & Map Navigation]
    M1.1 --> M1.1.2[Order Items]
    M1.1 --> M1.1.3[Update Status (Out for Delivery, Delivered, Failed)]
    M1.1 --> M1.1.4[Record Payment Collected (COD)]
    M1.1 --> M1.1.5[Record Empty Containers Picked Up]
    M1.1 --> M1.1.6[Capture Proof of Delivery (Photo/Signature)]

    M --> M2[Shift Reconciliation]
    M2 --> M2.1[Container Load-out Summary]
    M2 --> M2.2[Cash Collected Summary]
    M2 --> M2.3[Submit Shift Closure]

    M --> M3[Profile & Settings]
    M3 --> M3.1[Change Password]

```

## 12.3 Mobile Customer Application

```mermaid
graph TD
    N[Customer Login/Registration] --> O[Customer Dashboard]

    O --> O1[Place New Order]
    O1 --> O1.1[Select Products]
    O1.2 --> O1.2[Choose Delivery Address]
    O1.3 --> O1.3[Select Date/Time]
    O1.4 --> O1.4[Choose Payment Method]
    O1.5 --> O1.5[Confirm Order]

    O --> O2[Order History]
    O2 --> O2.1[Order Details]
    O2 --> O2.2[Track Order Status]
    O2 --> O2.3[Reorder Functionality]

    O --> O3[My Account]
    O3 --> O3.1[Profile & Addresses]
    O3.2 --> O3.2[Container Deposit Balance]
    O3.3 --> O3.3[Credit/Utang Balance]
    O3.4 --> O3.4[Loyalty Points Balance]
    O3.5 --> O3.5[Payment Methods]
    O3.6 --> O3.6[Standing Orders]

    O --> O4[Notifications (Push/In-app)]

```
