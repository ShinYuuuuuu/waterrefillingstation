# 23. Settings Modules

This section details all system configuration and settings modules within the Water Station Management System (WSMS), covering business rules, integrations, hardware, and operational parameters.

## 23.1 Business Rules Configuration

- **Objective:** Allow administrators to configure business rules without code changes.
- **Settings:**
  - **Pricing Rules:**
    - Default markup percentages by product category.
    - Reseller pricing tiers and discount percentages.
    - Promotional pricing (time-bound price overrides).
    - Senior citizen/PWD discount percentage (configurable per local regulations).
  - **Discount Rules:**
    - Maximum manual discount percentage per transaction (requires approval above threshold).
    - Loyalty discount percentage by tier.
    - Promo code definitions (code, discount type, amount/percentage, validity period, usage limit).
  - **Credit Rules:**
    - Default credit limit for new customers by type (retail/reseller/corporate).
    - Credit limit increase approval workflow.
    - Maximum credit days allowed.
  - **Deposit Rules:**
    - Container deposit amounts per container type (configurable by product).
    - Deposit forfeiture policy (full or partial for lost/damaged containers).
  - **Loyalty Rules:**
    - Points per peso spent (e.g., 1 point per ₱100).
    - Tier thresholds (points/spending required for each tier).
    - Points expiry policy (duration of inactivity before expiry).
    - Rewards catalog (available rewards and point costs).
  - **Tax Rules:**
    - VAT rate (configurable, e.g., 12%).
    - VAT-inclusive vs. VAT-exclusive pricing toggle.
    - Tax-exempt customer categories.
    - Per-branch tax configuration.
- **Key Entities:** `business_rules`, `pricing_tiers`, `promo_codes`, `loyalty_config`, `tax_config`.
- **CRUD Modules:** Business Rules (CRUD), Pricing Tiers (CRUD), Promo Codes (CRUD), Loyalty Config (CRUD), Tax Config (CRUD).

## 23.2 Branch & Location Settings

- **Objective:** Configure branch-specific settings for multi-branch deployments.
- **Settings:**
  - **Branch Profile:**
    - Branch name, address, contact number, email.
    - Business hours (opening/closing time per day).
    - Tax identification number (TIN).
    - Official receipt serial number range (per BIR requirements).
  - **Branch-Specific Rules:**
    - Default credit limit.
    - Default markup percentage.
    - VAT rate override.
    - Accepted payment methods (enable/disable per branch).
  - **Printer Configuration:**
    - Default receipt printer (thermal 58mm or 80mm).
    - Printer type and connection (USB, Bluetooth, WiFi, serial).
    - Receipt template per branch (logo, header text, footer text).
  - **Hardware Configuration:**
    - Barcode scanner type and COM port.
    - Cash drawer trigger (serial port or keyboard wedge).
    - POS terminal type (Android tablet, desktop, touchscreen).
- **Key Entities:** `branches`, `branch_settings`, `printer_configs`, `hardware_configs`.
- **CRUD Modules:** Branches (CRUD), Branch Settings (CRUD), Printer Configs (CRUD), Hardware Configs (CRUD).

## 23.3 User & Access Settings

- **Objective:** Manage system users, roles, and access permissions.
- **Settings:**
  - **User Management:**
    - Create, update, deactivate users.
    - Assign role(s) to each user.
    - Set branch scope for users (which branches they can access).
    - Reset passwords, force password change.
  - **Role Configuration:**
    - Define custom roles with granular permissions.
    - Permission matrix per module (Create, Read, Update, Delete, Approve).
    - Approval threshold configuration (e.g., voids above ₱500 require manager approval).
  - **Session Settings:**
    - Session timeout duration.
    - Maximum concurrent sessions per user.
    - PIN-based quick re-authentication for POS users.
    - Failed login attempt lockout (threshold and duration).
  - **MFA Configuration:**
    - Enable/disable MFA for specific roles (e.g., Owner, Accountant).
    - MFA method (TOTP, SMS, email).
- **Key Entities:** `users`, `roles`, `permissions`, `user_roles`, `audit_logs`.
- **CRUD Modules:** Users (CRUD), Roles (CRUD), Permissions (CRUD), Audit Logs (Read-only).

## 23.4 Notification Settings

- **Objective:** Configure notification channels, templates, and schedules.
- **Settings:**
  - **Channel Configuration:**
    - Enable/disable SMS, email, push notification channels.
    - SMS gateway configuration (API key, sender ID).
    - Email SMTP/SES configuration (host, port, credentials, from address).
    - Push notification service configuration (FCM/APNs keys).
  - **Notification Templates:**
    - Customize message templates for each notification type.
    - Template variables (e.g., `{customer_name}`, `{order_id}`, `{amount}`).
  - **Delivery Schedules:**
    - Reminder frequency and timing (e.g., send overdue reminder at 9 AM daily).
    - Quiet hours (no notifications during specified hours).
  - **Per-Role Notification Preferences:**
    - Staff can configure which notifications they receive and via which channel.
- **Key Entities:** `notification_settings`, `notification_templates`, `sms_config`, `email_config`.
- **CRUD Modules:** Notification Settings (CRUD), Templates (CRUD), SMS/Email Config (CRUD).

## 23.5 Integration Settings

- **Objective:** Configure third-party integrations for payments, messaging, and accounting.
- **Settings:**
  - **Payment Gateway Integration:**
    - GCash API credentials (API key, secret, callback URL).
    - Maya API credentials.
    - Bank payment gateway configuration.
    - Test/live mode toggle per integration.
  - **SMS Gateway Integration:**
    - SMS provider (e.g., Twilio, local Philippine provider).
    - API key, sender ID, rate limits.
  - **Accounting Integration:**
    - Export format configuration (JSON, CSV, QIF).
    - Accounting software mapping (chart of accounts codes per transaction type).
    - Scheduled export frequency.
  - **E-Commerce / Ordering App Integration:**
    - API endpoint configuration for customer portal/app.
    - API key management.
    - Webhook URL configuration for order events.
  - **Hardware Integration:**
    - Thermal printer driver configuration.
    - Barcode scanner configuration.
    - Cash drawer relay configuration.
    - Scale integration (for weighing accessories).
- **Key Entities:** `integrations`, `integration_configs`, `webhooks`.
- **CRUD Modules:** Integrations (CRUD), Integration Configs (CRUD), Webhooks (CRUD).

## 23.6 System & Operational Settings

- **Objective:** Configure global system behavior and operational parameters.
- **Settings:**
  - **System Configuration:**
    - System name and logo.
    - Default currency and currency symbol.
    - Date and time format.
    - Number formatting (decimal separator, thousands separator).
    - Language and locale.
  - **Offline Mode Settings:**
    - Offline queue size limit.
    - Auto-sync interval.
    - Conflict resolution strategy (last-write-wins vs. manual review).
  - **Backup Settings:**
    - Backup frequency (daily, hourly, on-demand).
    - Backup retention period (number of backups to keep).
    - Backup storage location (local, cloud, S3-compatible).
    - Auto-backup toggle.
  - **Data Retention:**
    - Transaction archival threshold (e.g., archive transactions older than 5 years).
    - Purge policy for archived data.
    - Audit log retention period.
  - **Printer & Hardware Settings:**
    - Default paper size for receipts.
    - Print logo on receipts (toggle).
    - Header/footer text for receipts.
    - Cash drawer pulse duration.
  - **Maintenance Mode:**
    - Enable/disable system for scheduled maintenance.
    - Maintenance message displayed to users.
    - Scheduled maintenance window.
- **Key Entities:** `system_settings`, `backup_configs`, `retention_policies`, `maintenance_windows`.
- **CRUD Modules:** System Settings (CRUD), Backup Configs (CRUD), Retention Policies (CRUD), Maintenance Windows (CRUD).

## 23.7 Report & Export Settings

- **Objective:** Configure report generation and data export behavior.
- **Settings:**
  - **Report Defaults:**
    - Default date range for reports.
    - Default branch filter.
    - Default export format (PDF, Excel, CSV).
  - **Scheduled Reports:**
    - Configure automatic report generation and email delivery.
    - Report type, frequency, recipients, and format.
  - **Export Configuration:**
    - Allowed export formats per role.
    - Maximum export row limit.
    - Export directory/path (for local exports).
  - **Custom Report Builder:**
    - Available data fields for custom reports.
    - Saved report templates.
    - Report sharing permissions.
- **Key Entities:** `report_settings`, `scheduled_reports`, `export_configs`, `report_templates`.
- **CRUD Modules:** Report Settings (CRUD), Scheduled Reports (CRUD), Export Configs (CRUD), Report Templates (CRUD).