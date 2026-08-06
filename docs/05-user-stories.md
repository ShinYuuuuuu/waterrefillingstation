# 5. User Stories

Format: `As a <role>, I want to <action>, so that <benefit>.` Grouped by role.

## 5.1 Owner / Business Admin
- As an Owner, I want to view a consolidated dashboard across all branches, so that I can monitor overall business performance.
- As an Owner, I want to set pricing and discount rules centrally, so that pricing stays consistent across branches.
- As an Owner, I want to approve large voids/refunds/discounts, so that fraud and revenue leakage are controlled.
- As an Owner, I want to view profit & loss and collectibles reports, so that I can make financial decisions.
- As an Owner, I want to receive a daily sales summary via email, so that I don't need to log in every day.
- As an Owner, I want to manage branches, users, and their roles, so that I can control who accesses what.
- As an Owner, I want to configure container deposit amounts and credit limits, so that business rules match my policies.

## 5.2 Branch Manager
- As a Branch Manager, I want to view my branch's daily sales and cash reconciliation, so that I can ensure accountability of cashiers.
- As a Branch Manager, I want to approve void/refund/discount requests from cashiers, so that unauthorized discounts are prevented.
- As a Branch Manager, I want to manage staff schedules and rider assignments, so that operations run smoothly.
- As a Branch Manager, I want to view low-stock alerts, so that I can reorder supplies in time.
- As a Branch Manager, I want to review delivery performance per rider, so that I can address inefficiencies.

## 5.3 Cashier / Counter Staff
- As a Cashier, I want to quickly add products to a cart using buttons or scanning, so that I can serve customers fast.
- As a Cashier, I want to record container exchange (empty in, full out), so that container inventory stays accurate.
- As a Cashier, I want to accept multiple payment methods in one sale, so that I can accommodate customer preference.
- As a Cashier, I want to print or send a digital receipt, so that the customer has proof of purchase.
- As a Cashier, I want to open and close my shift with a cash count, so that my accountability is documented.
- As a Cashier, I want to hold a transaction and resume it later, so that I can serve another customer in the meantime.

## 5.4 Inventory/Warehouse Staff
- As Inventory Staff, I want to log production batches, so that finished goods stock is updated accurately.
- As Inventory Staff, I want to scan container QR codes during stock movements, so that individual container tracking stays accurate.
- As Inventory Staff, I want to receive low-stock alerts for raw materials, so that I can reorder before running out.
- As Inventory Staff, I want to perform a physical stock count and record variances, so that book stock matches actual stock.
- As Inventory Staff, I want to log equipment maintenance activities, so that filter/membrane replacement schedules are tracked.

## 5.5 Rider / Delivery Personnel
- As a Rider, I want to see my assigned deliveries for the day with map directions, so that I can plan my route.
- As a Rider, I want to mark an order as delivered and capture a photo/signature, so that delivery is proof-documented.
- As a Rider, I want to record the payment collected and containers picked up, so that my daily reconciliation is accurate.
- As a Rider, I want to mark a delivery as failed with a reason, so that dispatch can reschedule it.
- As a Rider, I want to work offline when signal is poor and have my updates sync later, so that I'm not blocked from doing my job.

## 5.6 Dispatcher / Delivery Coordinator
- As a Dispatcher, I want to view all pending orders on a map, so that I can group them into efficient routes.
- As a Dispatcher, I want to assign orders to specific riders, so that delivery workload is balanced.
- As a Dispatcher, I want to track real-time delivery status, so that I can inform customers of delays.
- As a Dispatcher, I want to reassign a failed delivery to another rider or reschedule it, so that the customer still gets served.

## 5.7 Accountant / Bookkeeper
- As an Accountant, I want to generate a collections aging report, so that I can follow up on overdue accounts.
- As an Accountant, I want to export sales and payment data, so that I can prepare tax filings.
- As an Accountant, I want to reconcile e-wallet/bank payments against recorded transactions, so that discrepancies are caught early.
- As an Accountant, I want to view VAT summary reports, so that I can file taxes accurately.

## 5.8 Reseller / Dealer
- As a Reseller, I want to place bulk orders online, so that I don't need to call the station.
- As a Reseller, I want to view my account balance and consigned containers, so that I know what I owe or hold.
- As a Reseller, I want to view my commission earnings, so that I can track my income.

## 5.9 Customer
- As a Customer, I want to place a delivery order via app, so that I don't have to visit the station.
- As a Customer, I want to track my order status in real time, so that I know when to expect delivery.
- As a Customer, I want to view my container deposit balance, so that I know how many containers I owe the station.
- As a Customer, I want to view my loyalty points, so that I can redeem rewards.
- As a Customer, I want to set up a recurring/standing weekly order, so that I don't need to reorder manually every time.

## 5.10 Technician
- As a Technician, I want to log filter/membrane replacements with dates, so that maintenance history is documented.
- As a Technician, I want to receive alerts when maintenance is due, so that I don't miss scheduled servicing.

## 5.11 Super Admin (Vendor, multi-tenant SaaS)
- As a Super Admin, I want to provision new tenant accounts, so that new station clients can be onboarded quickly.
- As a Super Admin, I want to monitor system health across tenants, so that I can proactively address outages.
- As a Super Admin, I want to manage subscription/license status per tenant, so that billing for the SaaS product is enforced.
