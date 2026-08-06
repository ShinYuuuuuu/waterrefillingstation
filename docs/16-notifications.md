# 16. Notifications

This section details the various notifications and alerts within the Water Station Management System (WSMS), outlining their triggers, recipients, channels, and content. Notifications are critical for keeping users informed about system events, order status changes, and business-critical alerts.

## 16.1 Internal System Notifications (Staff-facing)

These notifications are typically delivered via in-app alerts (web dashboard), email, or push notifications to internal staff roles.

### 16.1.1 Low Stock Alert
- **Trigger:** `branch_inventory.quantity_on_hand` for a `product` falls below its `reorder_level`.
- **Recipient(s):** Branch Manager, Inventory Staff (scoped to affected branch).
- **Channels:** In-app, Email.
- **Content:** "Low stock alert for [Product Name] at [Branch Name]. Current stock: [Quantity]. Reorder level: [Level]."

### 16.1.2 Order Assignment Alert
- **Trigger:** A `delivery_order` is assigned to a `rider` or `delivery_route`.
- **Recipient(s):** Assigned Rider (mobile app push), Dispatcher (in-app).
- **Channels:** Push Notification (Rider), In-app (Dispatcher).
- **Content:** "New delivery order assigned: #[Order ID] for [Customer Name] at [Address]."

### 16.1.3 Delivery Failed Alert
- **Trigger:** A `delivery_order` status is updated to `failed` by a rider.
- **Recipient(s):** Dispatcher, Branch Manager.
- **Channels:** In-app, Email.
- **Content:** "Delivery #[Order ID] for [Customer Name] failed. Reason: [Failure Reason]."

### 16.1.4 Void/Refund Approval Request
- **Trigger:** A `sales_transaction` void or refund request (if above threshold) is initiated by a cashier.
- **Recipient(s):** Branch Manager, Owner (if applicable, for higher thresholds).
- **Channels:** In-app, Email, Push Notification.
- **Content:** "Approval required: Cashier [Cashier Name] requested void for transaction #[Invoice Number]. Amount: [Amount]. Reason: [Reason]."

### 16.1.5 Stock Transfer Approval Request
- **Trigger:** An `inventory_staff` initiates a `stock_transfer` request between branches.
- **Recipient(s):** Origin Branch Manager, Destination Branch Manager.
- **Channels:** In-app, Email.
- **Content:** "Stock transfer request from [Origin Branch] to [Destination Branch]. Items: [List of items]. Requires your approval."

### 16.1.6 Stock Count Variance Approval Request
- **Trigger:** An `inventory_staff` submits a `stock_count_session` with calculated variances.
- **Recipient(s):** Branch Manager.
- **Channels:** In-app, Email.
- **Content:** "Stock count session #[Session ID] for [Branch Name] submitted with variances. Requires your review and approval."

### 16.1.7 Equipment Maintenance Due Soon/Overdue
- **Trigger:** `maintenance_logs.next_due_at` for an `equipment` is approaching (e.g., 7 days prior) or has passed.
- **Recipient(s):** Technician, Branch Manager, Inventory Staff.
- **Channels:** In-app, Email.
- **Content:** "Equipment maintenance due: [Equipment Name] ([Type]) at [Branch Name]. Next due date: [Date]."

### 16.1.8 System Health/Error Alert
- **Trigger:** Critical system errors (e.g., database backup failure, sync engine failures, API integration errors, unhandled exceptions).
- **Recipient(s):** Owner, Super Admin (if SaaS).
- **Channels:** Email, SMS, External monitoring system (e.g., PagerDuty integration).
- **Content:** "CRITICAL: WSMS Backup failed for Tenant [Tenant ID]. Please investigate."

## 16.2 External Customer Notifications

These notifications are typically delivered via SMS, push notifications (mobile app), or email to customers and resellers.

### 16.2.1 Order Confirmation
- **Trigger:** Customer successfully places a `delivery_order`.
- **Recipient(s):** Customer.
- **Channels:** SMS, Push Notification, Email.
- **Content:** "Your order #[Order ID] with [Station Name] is confirmed! We'll notify you of delivery updates."

### 16.2.2 Order Status Update (Out for Delivery)
- **Trigger:** A `delivery_order` status changes to `out_for_delivery`.
- **Recipient(s):** Customer.
- **Channels:** SMS, Push Notification.
- **Content:** "Good news! Your order #[Order ID] from [Station Name] is now out for delivery. Rider [Rider Name] is on the way!"

### 16.2.3 Order Status Update (Delivered)
- **Trigger:** A `delivery_order` status changes to `delivered`.
- **Recipient(s):** Customer.
- **Channels:** SMS, Push Notification, Email (with e-receipt).
- **Content:** "Your order #[Order ID] from [Station Name] has been successfully delivered. Thank you!"

### 16.2.4 Payment Due/Overdue Reminder
- **Trigger:** Automated job detects `customer.current_balance` is due soon (e.g., 3 days before due date) or is `overdue`.
- **Recipient(s):** Customer.
- **Channels:** SMS, Email.
- **Content:** "Reminder: Your outstanding balance of [Amount] with [Station Name] is due on [Date]. Please settle soon."

### 16.2.5 Loyalty Points Update
- **Trigger:** Customer earns or redeems `loyalty_points`.
- **Recipient(s):** Customer.
- **Channels:** SMS, Push Notification.
- **Content:** "You've earned [Points] loyalty points! Your new balance is [Total Points]."

### 16.2.6 Promotional Offer / Birthday Greeting
- **Trigger:** Configured `promotions` become active, or customer's birthday/anniversary.
- **Recipient(s):** Targeted Customer Segment.
- **Channels:** SMS, Email, Push Notification.
- **Content:** "Happy Birthday, [Customer Name]! Enjoy [Discount]% off your next order. Valid for 7 days."

### 16.2.7 Account Credit Limit Exceeded Warning
- **Trigger:** A new transaction would cause `customer.current_balance` to exceed `credit_limit`.
- **Recipient(s):** Customer (if attempting credit purchase via app), Cashier (POS, as a prompt).
- **Channels:** In-app (POS), Push/SMS (Customer app).
- **Content:** "Warning: Your credit limit will be exceeded by this transaction. Please make a payment or contact us."

### 16.2.8 Reseller Order Confirmation
- **Trigger:** A `reseller` successfully places a bulk order.
- **Recipient(s):** Reseller.
- **Channels:** Email, In-app (Reseller Portal).
- **Content:** "Your bulk order #[Order ID] from [Station Name] is confirmed."

## 16.3 Notification Configuration

- System will allow Owners/Branch Managers to enable/disable certain notification types and configure recipient lists for internal alerts.
- Customers and Riders will have in-app settings to manage their preferences for marketing and non-critical operational notifications.
- Default templates for SMS/Email content will be configurable, allowing for custom branding and messaging.
