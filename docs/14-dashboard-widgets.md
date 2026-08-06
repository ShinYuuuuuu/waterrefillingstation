# 14. Dashboard Widgets

This section specifies the various dashboard widgets available to different user roles within the Water Station Management System (WSMS). Dashboards provide a quick, at-a-glance overview of key performance indicators (KPIs) and operational status relevant to the logged-in user's role and branch scope.

## 14.1 Owner / Business Admin Dashboard

- **Overall Sales Performance:**
  - **Widget:** **Total Revenue (Today/Week/Month)**
    - **Description:** Sum of `grand_total` from `sales_transactions` for selected period.
    - **Metrics:** Current period value, percentage change from previous period.
  - **Widget:** **Sales by Branch**
    - **Description:** Bar chart showing `grand_total` grouped by `branch_id` for selected period.
    - **Metrics:** Revenue per branch, total transactions per branch.
  - **Widget:** **Top Selling Products**
    - **Description:** List of products with highest sales volume/revenue for selected period.
    - **Metrics:** Product name, quantity sold, total revenue.
- **Financial Health:**
  - **Widget:** **Cash Position Summary**
    - **Description:** Current cash on hand across all branches (based on last closed shift balances).
    - **Metrics:** Total cash, breakdown by branch.
  - **Widget:** **Accounts Receivable Aging Summary**
    - **Description:** Snapshot of total outstanding credit, broken down by aging buckets (Current, 30-60, 61-90, 90+ days).
    - **Metrics:** Total outstanding, count of overdue customers.
- **Operational Overview:**
  - **Widget:** **Total Containers in Circulation**
    - **Description:** Sum of containers with status `with_customer`, `with_rider`, `with_reseller`.
    - **Metrics:** Total count, breakdown by status.
  - **Widget:** **Delivery Status Overview**
    - **Description:** Count of delivery orders by status (Pending, Assigned, Out for Delivery, Delivered, Failed) across all branches.
    - **Metrics:** Count per status, percentage completion.
- **Alerts & Notifications:**
  - **Widget:** **Low Stock Alerts (Consolidated)**
    - **Description:** Aggregated list of products/raw materials across all branches that are below reorder level.
    - **Metrics:** Product name, current stock, reorder level, affected branch.
  - **Widget:** **System Health Alerts**
    - **Description:** Critical system-level alerts (e.g., backup failures, sync errors, integration issues).
    - **Metrics:** Alert message, timestamp, severity.

## 14.2 Branch Manager Dashboard

- **Branch Sales Performance:**
  - **Widget:** **Daily Sales Summary (Branch)**
    - **Description:** Total sales, average transaction value, number of transactions for the current day.
    - **Metrics:** Today's sales, comparison to yesterday/last week.
  - **Widget:** **Sales by Payment Method (Branch)**
    - **Description:** Pie chart or bar chart showing sales distribution across payment methods for the current day/shift.
    - **Metrics:** Percentage breakdown per method.
- **Current Operations:**
  - **Widget:** **Active Delivery Orders (Branch)**
    - **Description:** List of orders currently `assigned` or `out_for_delivery` for the branch.
    - **Metrics:** Order ID, customer, rider, current status, time elapsed.
  - **Widget:** **Cashier Shift Status**
    - **Description:** List of open shifts, current cashier, opening cash, current transaction count.
    - **Metrics:** Shift ID, Cashier name, Shift open time.
- **Inventory & Assets:**
  - **Widget:** **Branch Low Stock Alerts**
    - **Description:** Products/raw materials in this specific branch below reorder level.
    - **Metrics:** Product name, current stock, reorder level.
  - **Widget:** **Containers at Branch**
    - **Description:** Count of containers currently `in_stock` at this branch, and `damaged` or `lost`.
    - **Metrics:** Count of available, damaged, lost containers.

## 14.3 Cashier / Counter Staff Dashboard

- **My Shift Summary:**
  - **Widget:** **Current Shift Sales**
    - **Description:** Total sales, number of transactions processed by the cashier in the current open shift.
    - **Metrics:** Shift ID, opening time, current total sales, transaction count.
  - **Widget:** **Containers Exchanged (Shift)**
    - **Description:** Total empty containers received and filled containers issued during the current shift.
    - **Metrics:** Empties in, Fills out.
- **Quick Access:**
  - **Widget:** **Common Products Grid**
    - **Description:** Configurable grid of frequently sold products for quick addition to cart.
  - **Widget:** **Recent Transactions**
    - **Description:** List of the last 5-10 transactions processed by the cashier.
    - **Metrics:** Invoice number, total, customer, status.

## 14.4 Inventory/Warehouse Staff Dashboard

- **Current Stock Overview:**
  - **Widget:** **Low Stock Alerts (My Branch)**
    - **Description:** List of products/raw materials in their branch that need reordering.
    - **Metrics:** Product, current stock, reorder level.
  - **Widget:** **Recent Stock Movements**
    - **Description:** Latest `inventory_ledger` entries (e.g., last 20).
    - **Metrics:** Product, movement type, quantity, timestamp.
- **Container & Production:**
  - **Widget:** **Container Status Summary (Branch)**
    - **Description:** Pie chart or count of containers at the branch by status (`in_stock`, `damaged`, `retired`).
  - **Widget:** **Maintenance Due Soon**
    - **Description:** List of equipment with upcoming maintenance dates.
    - **Metrics:** Equipment name, type, next due date.

## 14.5 Rider / Delivery Personnel Dashboard (Mobile App)

- **My Deliveries:**
  - **Widget:** **Today's Assigned Deliveries**
    - **Description:** List of all delivery orders assigned for the current day.
    - **Metrics:** Order ID, customer name, address, current status, payment type, amount due.
  - **Widget:** **Deliveries Pending Completion**
    - **Description:** Highlighted list of orders `out_for_delivery` or `assigned` but not yet `delivered`/`failed`.
    - **Metrics:** Order ID, time elapsed since assigned.
- **Shift Reconciliation Preview:**
  - **Widget:** **Cash to Collect**
    - **Description:** Sum of COD amounts for today's assigned deliveries that are not yet marked paid.
    - **Metrics:** Total pending cash collection.
  - **Widget:** **Containers to Pickup**
    - **Description:** Expected empty containers to pick up from today's deliveries.
    - **Metrics:** Total empties expected.

## 14.6 Dispatcher / Delivery Coordinator Dashboard

- **Delivery Operations Overview:**
  - **Widget:** **All Active Deliveries**
    - **Description:** Map view or list of all `assigned` and `out_for_delivery` orders across all riders/routes.
    - **Metrics:** Order ID, rider, status, estimated location (if GPS tracking).
  - **Widget:** **Pending Assignments**
    - **Description:** List of delivery orders in `pending` status, awaiting rider/route assignment.
    - **Metrics:** Order ID, requested delivery date, customer.
  - **Widget:** **Failed Deliveries Today**
    - **Description:** List of orders marked `failed` today, requiring rescheduling.
    - **Metrics:** Order ID, reason, failed rider.
- **Rider Performance:**
  - **Widget:** **Rider Status Board**
    - **Description:** Real-time status of all active riders (online/offline, number of deliveries in progress).
    - **Metrics:** Rider name, current order count.

## 14.7 Accountant Dashboard

- **Financial Health Summary:**
  - **Widget:** **Accounts Receivable Aging**
    - **Description:** High-level summary of total outstanding balances in different aging buckets.
  - **Widget:** **Recent Payments Received**
    - **Description:** List of the latest payments recorded, by method and amount.
  - **Widget:** **Revenue vs. Expenses (Summary)**
    - **Description:** High-level P&L summary widget (requires expense tracking, assumed in financial reports).
  - **Widget:** **Upcoming Collections**
    - **Description:** List of invoices/account balances due in the next 7 days.

## 14.8 Reseller / Dealer Dashboard (External Portal)

- **My Account Summary:**
  - **Widget:** **Current Account Balance**
    - **Description:** Outstanding balance owed to the water station.
  - **Widget:** **Containers on Consignment**
    - **Description:** Count of containers currently held by the reseller on consignment.
  - **Widget:** **Last 5 Orders**
    - **Description:** Quick view of recent orders placed.
  - **Widget:** **Loyalty/Commission Earnings**
    - **Description:** Summary of loyalty points or calculated commissions.

## 14.9 Customer Dashboard (Mobile App / Web Portal)

- **My Orders:**
  - **Widget:** **Current Order Status**
    - **Description:** Displays the latest status of their most recent active delivery order.
  - **Widget:** **Order History Snapshot**
    - **Description:** List of last 3-5 completed orders with quick reorder option.
- **My Account:**
  - **Widget:** **Container Deposit Balance**
    - **Description:** Number of empty containers currently held by the customer.
  - **Widget:** **Loyalty Points**
    - **Description:** Current loyalty points balance.
  - **Widget:** **Outstanding Balance (if credit customer)**
    - **Description:** Current credit/utang balance.
