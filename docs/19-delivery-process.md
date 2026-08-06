# 19. Delivery Process

This section outlines the delivery and logistics processes within the Water Station Management System (WSMS), covering order intake, dispatch, rider management, and fulfillment.

## 19.1 Order Intake

- **Objective:** Efficiently receive and record delivery requests from various channels.
- **Process:**
  1. **Customer Channel:**
     - **Walk-in / Phone-in:** `Counter Staff` or `Dispatcher` creates a `delivery_order` record in the system.
     - **Customer App / Web Portal:** `Customer` places an order directly through the app, which automatically creates a `delivery_order` record.
  2. **Order Details:** For each order, capture:
     - `customer_id` (or create new customer if not existing).
     - `address_id` (from customer_addresses or new address).
     - List of `delivery_order_items` (product and quantity).
     - Requested `delivery_date` and `time_slot`.
     - `payment_method` (Cash on Delivery (COD), on-account/credit, pre-paid).
     - Special instructions.
  3. **Standing Orders:** For recurring deliveries, `Customer` or `Staff` sets up a `standing_order` with frequency, items, and next delivery date. The system automatically generates `delivery_orders` as per schedule (see Section 17.1.5).
- **Key Entities:** `delivery_orders`, `delivery_order_items`, `customers`, `customer_addresses`, `standing_orders`.
- **CRUD Modules:** Delivery Orders (CRUD).

## 19.2 Order Dispatch & Route Management

- **Objective:** Assign delivery orders to riders and optimize routes for efficient fulfillment.
- **Process:**
  1. **View Pending Orders:** `Dispatcher` views all `pending` `delivery_orders` on a list or map interface.
  2. **Route Planning:** `Dispatcher` can manually group orders into `delivery_routes` based on geographic proximity or urgency. The system may suggest optimized routes.
  3. **Rider Assignment:** `Dispatcher` assigns individual `delivery_orders` or entire `delivery_routes` to specific `riders`.
  4. **Rider Load-out:** At the start of a `rider` shift, the `dispatcher` records the initial load of filled containers given to the `rider` in `rider_shifts`.
  5. **Status Update (Assigned):** System updates `delivery_order.status` to `assigned`. Customer receives `FR-NOT-002` (Order Confirmation) or `FR-NOT-003` (Order Status Update).
- **Key Entities:** `delivery_orders`, `delivery_routes`, `route_stops`, `users` (riders), `rider_shifts`.
- **CRUD Modules:** Delivery Routes (CRUD), Route Stops (CRUD).

## 19.3 Rider Mobile App Operations

- **Objective:** Enable riders to efficiently fulfill deliveries, collect payments, and manage containers in the field.
- **Process:**
  1. **Login:** `Rider` logs into the mobile app (phone number + OTP/PIN).
  2. **View Manifest:** `Rider` sees a list of `assigned` `delivery_orders` for their current shift (`FR-DEL-005`).
  3. **Navigation:** For each order, `Rider` can access map navigation to the customer address (`FR-DEL-005`).
  4. **Mark Out for Delivery:** `Rider` updates `delivery_order.status` to `out_for_delivery`. Customer receives `FR-NOT-003` (Order Status Update).
  5. **Delivery Fulfillment:**
     - `Rider` delivers the ordered items.
     - `Rider` collects empty containers from the customer, recording `empties_picked_up` (`FR-DEL-008`).
     - `Rider` collects `payment` if `payment_method` is COD, recording `amount_collected` and `payment_method` (`FR-DEL-008`).
     - `Rider` captures proof of delivery (photo and/or signature) (`FR-DEL-007`).
     - `Rider` marks `delivery_order.status` as `delivered`. Customer receives `FR-NOT-004` (Order Status Update - Delivered).
  6. **Handle Failed Delivery:** If delivery cannot be completed, `Rider` marks `delivery_order.status` as `failed` with a `failure_reason` (`FR-DEL-006`). Dispatcher is notified (`FR-NOT-003`).
  7. **Offline Mode:** The app operates offline, caching orders and updates. Transactions are queued locally and synchronized automatically when connectivity is restored (`FR-POS-014`).
- **Key Entities:** `delivery_orders`, `payments`, `containers`, `rider_shifts`.
- **CRUD Modules:** Delivery Order Status Update (Update), Payment Collection (Create), Proof of Delivery (Create).

## 19.4 Rider Shift Reconciliation

- **Objective:** Reconcile containers and cash handled by a rider during their shift to ensure accountability.
- **Process:**
  1. **Shift Closure:** At the end of their shift, `Rider` returns to the branch.
  2. **Physical Count:** `Dispatcher` or `Inventory Staff` physically counts:
     - Remaining filled containers still with the `rider`.
     - Empty containers collected by the `rider`.
     - Cash collected by the `rider` (COD payments).
  3. **System Reconciliation:** The system compares these physical counts against the `rider_shifts.containers_loaded_out`, `delivery_orders.empties_picked_up` and `payments.amount_collected` records.
  4. **Variance Reporting:** Any discrepancies (overages/shortages) in cash or containers are recorded as `variance` in `rider_shifts` and flagged for review.
  5. **Shift Closure:** `Dispatcher` closes the `rider_shift` record.
- **Key Entities:** `rider_shifts`, `delivery_orders`, `payments`.
- **CRUD Modules:** Rider Shift Closure (Update).
