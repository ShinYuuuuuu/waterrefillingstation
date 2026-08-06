# 21. Customer Management Process

This section details the customer relationship management (CRM) processes within the Water Station Management System (WSMS), covering customer lifecycle, credit management, loyalty programs, and communication.

## 21.1 Customer Registration

- **Objective:** Onboard new customers into the system with complete profile information.
- **Process:**
  1. **Identify Channel:** Customer is registered through one of the following channels:
     - Walk-in at the counter (counter staff creates record).
     - Delivery order placement (staff creates record during order intake).
     - Customer portal/app self-registration.
     - Reseller onboarding (owner/branch manager creates reseller profile).
  2. **Capture Profile Data:**
     - Full name (individual) or company name (corporate/reseller).
     - Contact numbers (primary and secondary).
     - Email address (optional for walk-in, required for portal users).
     - Delivery address(es) — multiple addresses per customer supported.
     - Customer type: `retail`, `reseller`, `corporate`.
     - Tax identification (for corporate/reseller accounts).
     - Credit limit (for credit/utang accounts, set by Owner/Branch Manager).
  3. **Assign Customer ID:** System generates a unique, sequential `customer_id`.
  4. **Initial Container Deposit:** If the customer takes containers on deposit, record `container_deposits` entries.
  5. **Save and Confirm:** Customer record is saved with `status = active`.
- **Key Entities:** `customers`, `customer_addresses`, `container_deposits`.
- **CRUD Modules:** Customers (CRUD), Customer Addresses (CRUD).

## 21.2 Customer Profile Management

- **Objective:** Maintain accurate and up-to-date customer information.
- **Process:**
  1. **Update Profile:** Staff or customer (via portal) can update contact details, addresses, or preferences.
  2. **Update Credit Limit:** Owner or Branch Manager can adjust credit limits.
  3. **Merge Duplicate Records:** If a customer has duplicate profiles, Owner/Branch Manager can merge them, transferring all history and balances.
  4. **Deactivate/Reactivate:** Customer can be deactivated (e.g., permanently closed account) or reactivated. Deactivation does not delete transactional history.
  5. **Tagging/Segmentation:** Staff can add tags (e.g., `VIP`, `wholesale`, `inactive`, `promo-opt-in`) for targeted marketing.
- **Key Entities:** `customers`, `customer_tags`.
- **CRUD Modules:** Customer Profile (CRU), Customer Tags (CRUD).

## 21.3 Container Deposit Management

- **Objective:** Track containers held by each customer and manage deposit refunds.
- **Process:**
  1. **Deposit Charged:** When a customer takes a filled container without returning an empty, a `container_deposit` entry is created with `amount`, `container_id`, and `customer_id`.
  2. **Deposit Held:** System maintains a running `total_deposit_held` per customer, visible on the customer profile.
  3. **Deposit Refunded:** When a customer returns a container and requests a refund:
     - Verify container is returned and in acceptable condition.
     - Process refund via the payment system (cash, e-wallet, or credited to account).
     - Update `container_deposits` entry with `refunded_at` and `refund_amount`.
     - Update `container.status` back to `in_stock`.
  4. **Deposit forfeiture:** If a container is lost or damaged beyond repair, the deposit may be forfeited per business rules, with Owner approval.
  5. **Statement:** Customer can request a deposit statement showing all deposits, returns, and refunds.
- **Key Entities:** `container_deposits`, `containers`, `customers`, `payments`.
- **CRUD Modules:** Container Deposits (CRUD), Container Status Update (Update).

## 21.4 Credit / Utang Account Management

- **Objective:** Manage customer credit accounts, track balances, and control exposure.
- **Process:**
  1. **Credit Account Setup:** Owner or Branch Manager enables credit for a customer, setting an initial `credit_limit`.
  2. **Sales on Account:** During checkout, if a customer chooses `payment_method = credit`, the system:
     - Checks `current_balance` against `credit_limit`.
     - If within limit, allows the sale and creates a `customer_ledger` entry.
     - If exceeded, blocks the sale and requires Owner/Branch Manager override with reason.
  3. **Payment Against Credit:** Customer makes a payment, which is applied to outstanding `customer_ledger` entries (oldest first, or configurable).
  4. **Overdue Tracking:** System tracks `due_date` on ledger entries. Overdue entries are flagged and trigger automated reminders (see `16-notifications.md`).
  5. **Credit Limit Increase:** Customer can request a credit limit increase. Requires Owner approval.
  6. **Credit Hold:** Owner/Branch Manager can place a hold on a customer's credit account (e.g., for suspected fraud or chronic late payment).
  7. **Statement Generation:** System generates periodic account statements showing all transactions, payments, and outstanding balance.
- **Key Entities:** `customers`, `customer_ledger`, `payments`, `credit_limits`.
- **CRUD Modules:** Customer Ledger (CRUD), Credit Limits (CRU).

## 21.5 Loyalty Program Management

- **Objective:** Manage the loyalty program, including points accrual, tier management, and rewards redemption.
- **Process:**
  1. **Points Accrual:** When a `sales_transaction` is completed with a customer attached, the system automatically calculates and adds loyalty points based on configured rules (e.g., 1 point per ₱100 spent). Points are recorded in `loyalty_transactions` and added to `customer.loyalty_points`.
  2. **Tier Management:** Customers are assigned tiers (e.g., Bronze, Silver, Gold, Platinum) based on cumulative points or spending. Tier benefits include:
     - Bronze: Standard points rate.
     - Silver: 1.2x points rate.
     - Gold: 1.5x points rate + priority delivery.
     - Platinum: 2x points rate + free delivery + priority support.
  3. **Rewards Redemption:** Customer can redeem accumulated points for:
     - Discounts on future purchases.
     - Free products (e.g., a free refill).
     - Accessories or merchandise.
     - Redemption is recorded in `loyalty_transactions` with `transaction_type = redemption`.
  4. **Points Expiry:** Configurable expiry policy (e.g., points expire after 12 months of inactivity). System sends notification before expiry.
  5. **Manual Adjustment:** Owner/Branch Manager can manually adjust points (e.g., for corrective purposes), with reason logged in audit trail.
- **Key Entities:** `customers`, `loyalty_transactions`, `loyalty_tiers`, `loyalty_rewards`.
- **CRUD Modules:** Loyalty Transactions (CRUD), Loyalty Tiers (CRUD), Loyalty Rewards (CRUD).

## 21.6 Purchase History & Analytics

- **Objective:** Provide staff and customers with visibility into purchase history.
- **Process:**
  1. **Staff View:** Counter staff, cashier, and managers can view a customer's full purchase history, including:
     - All `sales_transactions` linked to the customer.
     - Total spending (lifetime and period-based).
     - Favorite products.
     - Average order value.
     - Container deposit balance.
     - Credit balance and payment history.
  2. **Customer Portal View:** Customers can view their own:
     - Order history with status.
     - Account balance and credit usage.
     - Loyalty points and tier.
     - Saved addresses.
  3. **Reorder:** Customer can reorder from their purchase history with one click (adds items to a new delivery order or POS transaction).
- **Key Entities:** `customers`, `sales_transactions`, `sales_transaction_items`.
- **CRUD Modules:** Sales Transactions (Read-only for customer history view).

## 21.7 Customer Communication

- **Objective:** Manage targeted communication with customers for promotions, reminders, and service updates.
- **Process:**
  1. **Birthday/Anniversary Triggers:** System automatically sends promotional offers on customer birthdays or account anniversaries (configurable per customer).
  2. **Promotional Notifications:** Staff can create and send targeted promotions to customer segments (e.g., all Gold tier customers, customers in a specific area).
  3. **Order Status Notifications:** Automated notifications sent to customers at key delivery milestones (see `16-notifications.md`).
  4. **Feedback/Complaint Logging:** Customers can submit complaints or feedback via the portal or after delivery. Staff can log and track complaints with status (`open`, `in_progress`, `resolved`, `closed`).
  5. **Opt-Out Management:** Customers can opt out of promotional communications. System respects opt-out preferences.
- **Key Entities:** `customers`, `notifications`, `complaints`, `promotions`.
- **CRUD Modules:** Complaints (CRUD), Promotions (CRUD), Feedback (CRUD).

## 21.8 Customer Segmentation & Tagging

- **Objective:** Segment customers for targeted marketing, reporting, and operational purposes.
- **Process:**
  1. **Tag Assignment:** Staff can assign tags to customers:
     - By type: `retail`, `reseller`, `corporate`.
     - By status: `active`, `inactive`, `vip`, `new`, `churned`.
     - By preference: `promo-opt-in`, `sms-only`, `email-only`.
     - By area: `zone-A`, `zone-B`, etc.
  2. **Segment-Based Actions:** Tags enable filtered actions:
     - Send targeted promotions.
     - Generate segment-specific reports.
     - Apply segment-specific pricing or credit limits.
  3. **Automatic Segmentation:** System can auto-tag customers based on behavior (e.g., no purchase in 90 days → `inactive`, lifetime spend > ₱50,000 → `vip`).
- **Key Entities:** `customers`, `customer_tags`.
- **CRUD Modules:** Customer Tags (CRUD), Segments (Read-only generated).