# 10. API Design

This section outlines the REST API design for the Water Station Management System (WSMS) backend. The API will follow RESTful principles, use JSON for request/response bodies, and utilize standard HTTP methods (GET, POST, PUT, DELETE). Authentication will be token-based (e.g., JWT). All APIs will be scoped by `tenant_id` and `branch_id` where appropriate.

## 10.1 Authentication & Authorization

### `POST /api/v1/auth/login`
- **Description:** Authenticates a user and returns an access token.
- **Request Body:** `{ "email": "string", "password": "string" }`
- **Response Body:** `{ "access_token": "string", "refresh_token": "string", "user": { ...full user object... } }`
- **Errors:** 401 Unauthorized (invalid credentials)

### `POST /api/v1/auth/logout`
- **Description:** Invalidates the current user session.
- **Headers:** `Authorization: Bearer <token>`

### `POST /api/v1/auth/refresh-token`
- **Description:** Refreshes an expired access token using a refresh token.
- **Request Body:** `{ "refresh_token": "string" }`
- **Response Body:** `{ "access_token": "string" }`

### `POST /api/v1/auth/change-password`
- **Description:** Allows a logged-in user to change their password.
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** `{ "old_password": "string", "new_password": "string" }`

### `POST /api/v1/auth/reset-password`
- **Description:** Initiates password reset process (sends email/SMS with reset link/code).
- **Request Body:** `{ "email": "string" }`

### `POST /api/v1/auth/reset-password/confirm`
- **Description:** Confirms password reset with token/code.
- **Request Body:** `{ "email": "string", "reset_code": "string", "new_password": "string" }`

## 10.2 User & Roles Management

### `GET /api/v1/users`
- **Description:** Retrieves a list of users (filterable by branch, role, status).
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `users.read`

### `POST /api/v1/users`
- **Description:** Creates a new user.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `users.create`

### `GET /api/v1/users/{id}`
- **Description:** Retrieves details of a specific user.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `users.read`

### `PUT /api/v1/users/{id}`
- **Description:** Updates an existing user.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `users.update`

### `DELETE /api/v1/users/{id}`
- **Description:** Deactivates/soft-deletes a user.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `users.delete`

### `GET /api/v1/roles`
- **Description:** Retrieves a list of available roles and permissions.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `roles.read`

## 10.3 Branch Management

### `GET /api/v1/branches`
- **Description:** Retrieves a list of branches for the tenant.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `branches.read`

### `GET /api/v1/branches/{id}/settings`
- **Description:** Retrieves branch-specific settings.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `branch_settings.read`

### `PUT /api/v1/branches/{id}/settings`
- **Description:** Updates branch-specific settings.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `branch_settings.update`

## 10.4 Product & Inventory Management

### `GET /api/v1/products`
- **Description:** Retrieves a list of products (filterable by category, type, status, branch).
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `products.read`

### `POST /api/v1/products`
- **Description:** Creates a new product.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `products.create`

### `PUT /api/v1/products/{id}`
- **Description:** Updates a product.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `products.update`

### `GET /api/v1/inventory/branch/{branchId}/stock`
- **Description:** Retrieves current stock levels for a branch.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `inventory.read`

### `GET /api/v1/containers`
- **Description:** Retrieves a list of individual containers (filterable by tag, status, holder).
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `containers.read`

### `POST /api/v1/containers`
- **Description:** Registers new containers (e.g., after purchase).
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `containers.create`

### `PUT /api/v1/containers/{id}/status`
- **Description:** Updates a container's status (e.g., damaged, lost, retired).
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `containers.update`

### `POST /api/v1/inventory/production-batches`
- **Description:** Records a new production batch.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `production.create`

### `POST /api/v1/inventory/stock-transfers`
- **Description:** Initiates a stock transfer request between branches.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `stock_transfers.create`

### `PUT /api/v1/inventory/stock-transfers/{id}/receive`
- **Description:** Confirms receipt of a stock transfer at the destination branch.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `stock_transfers.update`

### `POST /api/v1/inventory/stock-counts`
- **Description:** Initiates a new physical stock count session.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `stock_counts.create`

### `PUT /api/v1/inventory/stock-counts/{id}/submit`
- **Description:** Submits counted quantities for approval.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `stock_counts.update`

### `POST /api/v1/equipment/{id}/maintenance-logs`
- **Description:** Logs equipment maintenance.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `maintenance.create`

## 10.5 Customer Management (CRM)

### `GET /api/v1/customers`
- **Description:** Retrieves a list of customers.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `customers.read`

### `POST /api/v1/customers`
- **Description:** Creates a new customer.
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** `{ "full_name": "string", "phone": "string", "address": { ... }, "customer_type": "retail" }`
- **Permissions:** `customers.create`

### `GET /api/v1/customers/{id}`
- **Description:** Retrieves customer details.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `customers.read`

### `PUT /api/v1/customers/{id}`
- **Description:** Updates customer details.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `customers.update`

### `GET /api/v1/customers/{id}/container-balance`
- **Description:** Retrieves a customer's container deposit balance.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `customers.read_container_balance`

### `POST /api/v1/customers/{id}/credit-limit-approval`
- **Description:** Requests approval for a credit limit increase.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `customers.request_credit_increase`

### `GET /api/v1/customers/{id}/loyalty-points`
- **Description:** Retrieves a customer's loyalty points.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `customers.read_loyalty`

## 10.6 Sales & POS

### `POST /api/v1/sales/transactions`
- **Description:** Creates a new sales transaction (POS or Delivery-initiated).
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** `{ "branch_id": "uuid", "customer_id": "uuid" (optional), "items": [...], "payments": [...] }`
- **Permissions:** `sales.create`
- **Idempotency:** Request will include an `X-Idempotency-Key` header for offline sync.

### `POST /api/v1/sales/transactions/{id}/void`
- **Description:** Voids a sales transaction.
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** `{ "reason": "string", "approval_pin": "string" (if required) }`
- **Permissions:** `sales.void`

### `POST /api/v1/sales/transactions/{id}/refund`
- **Description:** Processes a refund for a sales transaction.
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** `{ "items": [...], "refund_payments": [...] }`
- **Permissions:** `sales.refund`

### `POST /api/v1/shifts/{shiftId}/close`
- **Description:** Closes a cashier's shift.
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** `{ "closing_cash_actual": "decimal" }`
- **Permissions:** `shifts.close`

## 10.7 Delivery Management

### `GET /api/v1/delivery/orders`
- **Description:** Retrieves a list of delivery orders (filterable by status, rider, branch).
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `delivery.read`

### `POST /api/v1/delivery/orders`
- **Description:** Creates a new delivery order.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `delivery.create`

### `PUT /api/v1/delivery/orders/{id}/assign`
- **Description:** Assigns a rider to a delivery order.
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** `{ "rider_id": "uuid" }`
- **Permissions:** `delivery.assign_rider`

### `PUT /api/v1/delivery/orders/{id}/status`
- **Description:** Updates the status of a delivery order (e.g., out_for_delivery, delivered, failed).
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** `{ "status": "string", "proof_photo_url": "string" (optional), "proof_signature_url": "string" (optional), "payment_collected": { "amount": "decimal", "method": "string" } (optional), "empties_picked_up": [{ "product_id": "uuid", "quantity": "integer" }] (optional) }`
- **Permissions:** `delivery.update_status` (rider, dispatcher)

### `GET /api/v1/delivery/riders/{riderId}/assigned-orders`
- **Description:** Retrieves orders assigned to a specific rider.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `delivery.read_rider_orders`

### `POST /api/v1/delivery/standing-orders`
- **Description:** Creates a new standing (recurring) order.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `standing_orders.create`

## 10.8 Payments & Billing

### `GET /api/v1/payments`
- **Description:** Retrieves a list of payments (filterable by customer, method, date).
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `payments.read`

### `POST /api/v1/payments`
- **Description:** Records a standalone payment (e.g., account payment, deposit refund).
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** `{ "customer_id": "uuid", "amount": "decimal", "method": "string" }`
- **Permissions:** `payments.create`

### `GET /api/v1/customers/{id}/statements`
- **Description:** Retrieves customer statements.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `customers.read_statements`

### `GET /api/v1/reports/aging`
- **Description:** Generates an accounts receivable aging report.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `reports.read_aging`

## 10.9 Reports & Dashboard

### `GET /api/v1/dashboard/kpis`
- **Description:** Retrieves dashboard KPIs for the current user's scope (branch/tenant).
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `dashboard.read`

### `GET /api/v1/reports/{reportName}`
- **Description:** Generates a specific report.
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:** `startDate`, `endDate`, `branchId` (optional), `format` (pdf/excel/csv)
- **Permissions:** `reports.read_{reportName}`

### `POST /api/v1/reports/schedule`
- **Description:** Schedules a report for automated generation and email delivery.
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** `{ "report_name": "string", "frequency": "daily", "recipients": ["email@example.com"] }`
- **Permissions:** `reports.schedule`

## 10.10 Notifications

### `GET /api/v1/notifications/in-app`
- **Description:** Retrieves current user's in-app notifications.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `notifications.read`

### `PUT /api/v1/notifications/in-app/{id}/read`
- **Description:** Marks an in-app notification as read.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `notifications.update`

## 10.11 System Settings & Integrations

### `GET /api/v1/settings`
- **Description:** Retrieves tenant-wide and branch-specific settings.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `settings.read`

### `PUT /api/v1/settings`
- **Description:** Updates tenant-wide or branch-specific settings.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `settings.update`

### `GET /api/v1/integrations`
- **Description:** Retrieves configured external integrations.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `integrations.read`

### `POST /api/v1/integrations`
- **Description:** Configures a new external integration.
- **Headers:** `Authorization: Bearer <token>`
- **Permissions:** `integrations.create`

## 10.12 Webhooks

### `POST /api/v1/webhooks/payment-confirmation/{provider}`
- **Description:** Endpoint for e-wallet providers (e.g., GCash, Maya) to send payment confirmation callbacks.
- **Security:** Requires provider-specific signature validation and IP whitelisting.
- **Request Body:** Provider-specific JSON payload.

### `POST /api/v1/webhooks/order-updates`
- **Description:** Outgoing webhooks to notify third-party systems (e.g., accounting) of order/sales events.
- **Security:** Configurable secret for HMAC signature.
- **Request Body:** `{ "event_type": "sale_completed", "payload": { ...sale_transaction_data... } }`
