# 15. Reports

This section details the various reports available in the Water Station Management System (WSMS), categorized by business area. All reports should be filterable by date range and branch (for multi-branch roles) and exportable to PDF, Excel, and CSV formats.

## 15.1 Sales Reports

### 15.1.1 Daily Sales Report
- **Description:** Summary of sales activities for a single day, typically generated at the end of a cashier shift (Z-reading).
- **Key Metrics:** Total Net Sales, Gross Sales, Discounts, Taxes, Total Transactions, Sales by Payment Method, Sales by Product Category, Sales by Product Item, Voided Transactions (details with reason and approval).
- **Filters:** Date, Branch, Cashier.

### 15.1.2 Sales Summary Report (Period-based)
- **Description:** Aggregated sales data over a selected period (e.g., weekly, monthly, quarterly, custom date range).
- **Key Metrics:** Total Revenue, Average Sale Value, Number of Transactions, Top 10 Products by Revenue/Quantity, Sales Trends (chart).
- **Filters:** Date Range, Branch.

### 15.1.3 Sales by Product Report
- **Description:** Details sales performance of individual products.
- **Key Metrics:** Product Name, SKU, Quantity Sold, Total Revenue, Cost of Goods Sold (COGS), Gross Profit.
- **Filters:** Date Range, Branch, Product Category, Product Name.

### 15.1.4 Sales by Payment Method Report
- **Description:** Breakdown of sales revenue by payment type.
- **Key Metrics:** Payment Method (Cash, GCash, Maya, Bank Transfer, Card, Credit), Total Amount, Percentage of Total Sales.
- **Filters:** Date Range, Branch.

### 15.1.5 Voided/Refunded Transactions Report
- **Description:** Lists all transactions that were voided or refunded.
- **Key Metrics:** Transaction ID, Date, Original Amount, Void/Refund Amount, Reason, Approver, Cashier.
- **Filters:** Date Range, Branch, Status (Voided, Refunded), Approver.

### 15.1.6 Sales by Customer Report
- **Description:** Ranks customers by their total purchase value or frequency.
- **Key Metrics:** Customer Name, Total Purchase Amount, Number of Transactions, Average Transaction Value.
- **Filters:** Date Range, Branch, Customer Type (Retail, Reseller, Corporate).

## 15.2 Inventory Reports

### 15.2.1 Current Stock Levels Report
- **Description:** Real-time snapshot of quantities on hand for all products.
- **Key Metrics:** Product Name, SKU, Category, Current Quantity on Hand, Reorder Level, Status (In Stock, Low Stock, Out of Stock).
- **Filters:** Branch, Product Category, Stock Status.

### 15.2.2 Stock Movement History Report
- **Description:** Detailed ledger of all inventory ins and outs.
- **Key Metrics:** Date/Time, Product, Movement Type (Sale, Purchase, Production, Transfer In/Out, Adjustment, Write-off, Return), Quantity Delta, Reference (Transaction ID, Batch ID, Transfer ID).
- **Filters:** Date Range, Branch, Product, Movement Type.

### 15.2.3 Container Asset Status Report
- **Description:** Tracks the status and location of all individually tagged containers.
- **Key Metrics:** Container Tag ID, Product Type (e.g., 5-Gal Round), Status (In Stock, With Customer, With Rider, Damaged, Lost, Retired), Current Holder, Current Branch, Last Movement Date.
- **Filters:** Status, Holder Type, Branch.

### 15.2.4 Production Report
- **Description:** Summarizes water purification production runs.
- **Key Metrics:** Batch Number, Production Date, Output Product, Output Quantity, Raw Material Input (estimated), Operator, Quality Check Result.
- **Filters:** Date Range, Branch.

### 15.2.5 Stock Transfer Report
- **Description:** Details all stock transfers between branches.
- **Key Metrics:** Transfer ID, Origin Branch, Destination Branch, Status, Requested By, Approved By, Items (Product, Quantity Sent, Quantity Received).
- **Filters:** Date Range, Status.

### 15.2.6 Stock Count Variance Report
- **Description:** Compares physical count against book quantities and highlights discrepancies.
- **Key Metrics:** Count Session ID, Product, Book Quantity, Counted Quantity, Variance (Quantity, Percentage), Notes, Approved By.
- **Filters:** Date Range (of count session), Branch.

### 15.2.7 Equipment Maintenance Report
- **Description:** Overview of maintenance activities and upcoming schedules.
- **Key Metrics:** Equipment Name, Type, Last Maintenance Date, Next Due Date, Technician, Notes.
- **Filters:** Branch, Equipment Type, Status (Due Soon, Overdue, Completed).

## 15.3 Delivery Reports

### 15.3.1 Delivery Performance Report
- **Description:** Evaluates the efficiency of delivery operations.
- **Key Metrics:** Total Deliveries, On-Time Deliveries, Failed Deliveries (with reasons), Average Delivery Time, Deliveries per Rider, Containers Picked Up.
- **Filters:** Date Range, Branch, Rider.

### 15.3.2 Rider Reconciliation Report
- **Description:** Daily summary of a rider's assigned load, deliveries, collections, and container returns.
- **Key Metrics:** Rider Name, Shift Date, Containers Loaded Out, Containers Delivered, Empties Picked Up, Cash Collected (Actual vs. Expected), Variance.
- **Filters:** Date, Rider.

### 15.3.3 Standing Orders Report
- **Description:** Lists all active recurring delivery orders.
- **Key Metrics:** Customer Name, Address, Frequency, Next Delivery Date, Items.
- **Filters:** Status (Active, Paused, Cancelled).

## 15.4 Customer Reports

### 15.4.1 Customer List Report
- **Description:** Comprehensive list of all registered customers.
- **Key Metrics:** Customer Name, Contact Info, Addresses, Customer Type, Credit Limit, Current Balance, Loyalty Points, Container Deposit Balance.
- **Filters:** Customer Type, Status (Active, Inactive, Blocked).

### 15.4.2 Accounts Receivable Aging Report
- **Description:** Details outstanding customer credit balances categorized by their age (how long they've been due).
- **Key Metrics:** Customer Name, Total Outstanding, Current, 1-30 Days Overdue, 31-60 Days Overdue, 61-90 Days Overdue, 90+ Days Overdue.
- **Filters:** Branch.

### 15.4.3 Customer Loyalty Report
- **Description:** Tracks loyalty points accrual and redemption.
- **Key Metrics:** Customer Name, Total Points Earned, Total Points Redeemed, Current Balance, Loyalty Tier.
- **Filters:** Date Range, Loyalty Tier.

### 15.4.4 Customer Container Deposit Report
- **Description:** Lists customers who currently hold company containers under deposit.
- **Key Metrics:** Customer Name, Total Containers Held, Total Deposit Value, Details per Container Type.
- **Filters:** Customer Name, Branch.

### 15.4.5 Customer Complaints Report
- **Description:** Tracks recorded customer complaints.
- **Key Metrics:** Complaint ID, Customer, Subject, Description, Status, Assigned To, Created Date, Resolved Date.
- **Filters:** Status, Assigned To, Date Range.

## 15.5 Financial Reports

### 15.5.1 Profit & Loss Summary
- **Description:** High-level overview of revenue vs. expenses.
- **Key Metrics:** Total Revenue, Cost of Goods Sold, Gross Profit, Operating Expenses (if tracked), Net Profit.
- **Filters:** Date Range, Branch.

### 15.5.2 Cash Flow Statement
- **Description:** Tracks cash inflows and outflows (direct or indirect method, typically direct for small businesses).
- **Key Metrics:** Cash from Operations, Cash from Investing, Cash from Financing, Net Cash Change, Beginning Cash Balance, Ending Cash Balance.
- **Filters:** Date Range, Branch.

### 15.5.3 Payment Reconciliation Report
- **Description:** Helps match recorded payments with bank/e-wallet statements.
- **Key Metrics:** Payment ID, Date, Amount, Method, System Reference, External Reference (e.g., bank transaction ID), Reconciliation Status.
- **Filters:** Date Range, Payment Method, Reconciliation Status.

### 15.5.4 Tax Summary Report (e.g., VAT Summary)
- **Description:** Summarizes taxable sales and purchases for tax filing purposes.
- **Key Metrics:** Total VATable Sales, VAT Exempt Sales, Zero-Rated Sales, Output VAT, Input VAT (if purchase module exists), VAT Payable.
- **Filters:** Date Range, Branch.

## 15.6 Administration Reports

### 15.6.1 Audit Log Report
- **Description:** Detailed, immutable log of all critical system actions.
- **Key Metrics:** Date/Time, User, Action, Entity Type, Entity ID, IP Address, Before Value, After Value.
- **Filters:** Date Range, User, Action Type, Entity Type.

### 15.6.2 User Activity Report
- **Description:** Tracks user login/logout and key actions.
- **Key Metrics:** User, Role, Branch, Login Time, Logout Time, Total Active Time, Number of Transactions/Actions.
- **Filters:** Date Range, User, Role, Branch.
