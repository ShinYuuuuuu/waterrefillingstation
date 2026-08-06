# 11. Security Design

This document details the security design for the Water Station Management System (WSMS), covering authentication, authorization, data protection, and general security best practices.

## 11.1 Threat Model (High-Level)

| Threat ID | Threat | Description | Countermeasures |
|---|---|---|---|
| T1 | Unauthorized Access | Malicious actor gains access to system resources or data without proper authentication/authorization. | Strong AuthN (MFA, brute-force protection), RBAC, API Gateway, Network Segmentation. |
| T2 | Data Tampering | Unauthorized modification of sensitive data (e.g., sales records, inventory levels, customer balances). | Immutability (audit logs, soft deletes), data encryption, integrity checks (checksums/hashes), RBAC, strict input validation. |
| T3 | Data Exposure | Sensitive data (PII, financial info) is leaked or accessed by unauthorized individuals. | Encryption at rest/in transit, strict access control, logging, data masking, secure coding practices. |
| T4 | Denial of Service (DoS) | System resources are overwhelmed, preventing legitimate users from accessing services. | Rate limiting, load balancing, robust infrastructure, WAF. |
| T5 | Injection Attacks | Malicious code (SQL, XSS) injected into inputs to compromise the system. | Input validation (whitelist), parameterized queries, output encoding. |
| T6 | Session Hijacking | Attacker takes over an authenticated user's session. | Secure cookies (HttpOnly, Secure, SameSite), short-lived access tokens, refresh tokens, session invalidation on logout/password change. |
| T7 | Insider Threat | Legitimate users (e.g., employees) abuse their access privileges. | Audit logging, RBAC (least privilege), separation of duties, regular access reviews.
| T8 | Supply Chain Attack | Compromise of third-party libraries or dependencies. | Dependency scanning, vulnerability management, secure build pipelines.
| T9 | Configuration Errors | Misconfigured systems expose vulnerabilities. | Automated configuration management, secure defaults, regular security audits.

## 11.2 Authentication (AuthN)

- **Mechanism:** JWT (JSON Web Tokens) for API authentication.
  - **Access Tokens:** Short-lived (e.g., 15-30 minutes), used for authenticating API requests.
  - **Refresh Tokens:** Long-lived (e.g., 7-30 days), used to obtain new access tokens without re-logging in. Stored securely (e.g., HttpOnly cookie for web, secure storage for mobile).
- **Credentials:**
  - **Passwords:** Hashed using a strong, memory-hard algorithm (e.g., Argon2, bcrypt) with a unique salt per user. Never stored in plaintext.
  - **PINs:** For POS quick re-authentication, hashed similarly to passwords.
- **Multi-Factor Authentication (MFA):**
  - Optional for Owner, Accountant, Super Admin roles. Supports TOTP (Time-based One-Time Password) or SMS OTP.
- **Session Management:**
  - JWTs are stateless; backend validates token signature and expiry.
  - Refresh tokens are managed on the server (stored in DB) and invalidated on logout, password change, or explicit revocation.
  - Automatic session expiration after a configurable inactivity period (NFR-AUTH-08).
- **Brute-Force Protection:**
  - Rate limiting on login endpoints (e.g., 5 attempts per IP/username per 15 minutes).
  - Account lockout after excessive failed attempts (e.g., 5 failures = 15-minute lockout).
  - CAPTCHA or similar challenge on suspicious login attempts.

## 11.3 Authorization (AuthZ)

- **Mechanism:** Role-Based Access Control (RBAC).
  - **Roles:** Defined in `04-user-roles.md` (e.g., Owner, Branch Manager, Cashier, Rider, Customer).
  - **Permissions:** Granular permissions associated with roles (e.g., `sales.create`, `inventory.read`, `users.update`).
  - **Enforcement:** All API endpoints (backend) will enforce RBAC checks server-side.
  - **Branch-level Scoping:** User permissions automatically restricted to their assigned branch(es) unless they hold an HQ/Super Admin role (e.g., a Branch Manager can only see inventory/sales data for their branch).
  - **Data-level Authorization:** For sensitive actions (e.g., voiding a transaction, increasing credit limit), additional data-level checks (e.g., transaction amount thresholds, current credit balance) and multi-party approval workflows will be enforced.

## 11.4 Data Protection

- **Encryption in Transit:**
  - All network communication (client-server, server-server, API integrations) shall use HTTPS/TLS 1.2+.
  - Strict TLS configurations (no weak ciphers, HSTS).
- **Encryption at Rest:**
  - Sensitive data (PII, payment information, password hashes, API keys for integrations) in the database will be encrypted.
  - Column-level encryption for highly sensitive fields (e.g., customer full address, full payment card numbers if stored).
  - Database disk encryption will be utilized where available (cloud provider features).
- **Data Masking/Redaction:**
  - In logs, sensitive data (e.g., full credit card numbers, PII) will be masked or redacted.
  - On UI, sensitive data will be partially masked (e.g., `**** **** **** 1234`).
- **Data Integrity:**
  - Use of database transactions to ensure atomicity of operations.
  - Audit logs for all critical changes, voids, and financial adjustments.
  - Soft deletes for transactional data to preserve history.

## 11.5 Secure Coding Practices

- **Input Validation:**
  - Strict input validation on all user-supplied data at the API boundary (server-side).
  - Whitelist approach where possible (allow only known good inputs).
  - Prevention of SQL Injection (parameterized queries), XSS (output encoding), CSRF (anti-CSRF tokens for web forms), other common OWASP Top 10 vulnerabilities.
- **Error Handling & Logging:**
  - Generic error messages to avoid leaking sensitive system information.
  - Detailed, structured logging of errors for debugging and security monitoring, but without PII.
  - Integration with error tracking systems (e.g., Sentry).
- **Dependency Management:**
  - Regular scanning of third-party libraries for known vulnerabilities (e.g., Snyk, Dependabot).
  - Keep dependencies updated.
- **Configuration Management:**
  - Segregation of configuration settings (development, staging, production).
  - Secrets (API keys, database credentials) managed securely (environment variables, secret management services like AWS Secrets Manager/Vault).
  - Never hardcode secrets in code.

## 11.6 Operational Security

- **Audit Logs:**
  - Comprehensive, immutable audit log of all system activities, especially sensitive ones (logins, data changes, voids, approvals, configuration updates).
  - Includes user, timestamp, IP, action, entity affected, and before/after values.
  - See `audit_logs` table in `07-database-design.md`.
- **Automated Backups:**
  - Regular, automated, encrypted database backups stored offsite.
  - Restore procedures regularly tested.
- **Network Security:**
  - Firewalls configured to restrict access to backend services only from necessary ports/IPs.
  - Use of VPNs for administrative access.
- **Incident Response:**
  - Defined procedures for detecting, responding to, and recovering from security incidents.
- **Regular Security Audits & Penetration Testing:**
  - Periodic external security audits and penetration testing to identify vulnerabilities.

## 11.7 Compliance

- **Data Privacy Act (RA 10173):** Adherence to principles of transparency, legitimate purpose, proportionality, and ensuring data subject rights (access, rectification, erasure, portability).
- **Tax Compliance:** Invoice numbering, void tracking, and reporting designed to meet local tax authority requirements.
