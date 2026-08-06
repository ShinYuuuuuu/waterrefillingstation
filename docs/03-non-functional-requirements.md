# 3. Non-Functional Requirements

## 3.1 Performance
- **NFR-PERF-01**: POS transaction submission (cart to receipt) shall complete in ≤ 2 seconds under normal load (online mode) and instantaneously in offline mode.
- **NFR-PERF-02**: Dashboard widgets shall load in ≤ 3 seconds for datasets up to 3 years of transactional history.
- **NFR-PERF-03**: System shall support at least 50 concurrent POS terminals per branch and 500 concurrent users across a multi-branch deployment without degradation.
- **NFR-PERF-04**: Report generation for date ranges up to 1 year shall complete in ≤ 10 seconds; larger ranges may be processed asynchronously with notification on completion.

## 3.2 Availability & Reliability
- **NFR-AVAIL-01**: Core cloud services shall target 99.5% uptime (excluding scheduled maintenance windows).
- **NFR-AVAIL-02**: POS and rider apps shall remain fully functional for core sale/delivery-update operations during internet outages (offline-first).
- **NFR-AVAIL-03**: System shall auto-sync queued offline transactions within 60 seconds of connectivity restoration.
- **NFR-AVAIL-04**: Database shall be backed up daily with point-in-time recovery capability for at least 30 days.

## 3.3 Scalability
- **NFR-SCAL-01**: Architecture shall support horizontal scaling of the API layer independent of the database.
- **NFR-SCAL-02**: System shall support growth from a single branch to 100+ branches without schema redesign (branch_id present on all tenant-scoped tables from day one).

## 3.4 Security
- **NFR-SEC-01**: All client-server traffic shall use TLS 1.2 or higher.
- **NFR-SEC-02**: Passwords shall be hashed using a memory-hard algorithm (bcrypt/argon2) with per-user salt.
- **NFR-SEC-03**: PII and payment-related fields shall be encrypted at rest (column-level or full-disk encryption at minimum).
- **NFR-SEC-04**: All privileged actions shall be authorized via RBAC checks enforced server-side (never trust client-side role checks alone).
- **NFR-SEC-05**: System shall maintain a tamper-evident audit log for financial and inventory-adjusting transactions.
- **NFR-SEC-06**: System shall implement rate limiting on authentication and public API endpoints.
- **NFR-SEC-07**: See `11-security-design.md` for full threat model and controls.

## 3.5 Usability
- **NFR-USE-01**: POS screen shall be operable via touch on a 10" tablet with minimum 44px touch targets.
- **NFR-USE-02**: Common POS actions (add item, checkout) shall require no more than 3 taps.
- **NFR-USE-03**: UI shall support English and Filipino language toggling.
- **NFR-USE-04**: UI shall follow WCAG 2.1 AA accessibility guidelines for web-based back-office screens.

## 3.6 Maintainability
- **NFR-MAINT-01**: Codebase shall follow a modular, layered architecture (see `09-folder-architecture.md`) to isolate business logic from framework/infrastructure code.
- **NFR-MAINT-02**: All modules shall have automated test coverage for critical business logic (inventory ledger, payment calculation, credit limit enforcement) at minimum 70%.
- **NFR-MAINT-03**: System shall use database migrations (versioned, reversible) for all schema changes.

## 3.7 Portability
- **NFR-PORT-01**: Backend shall be deployable via containerization (Docker) to support cloud or on-premise hosting.
- **NFR-PORT-02**: Mobile apps shall target Android first (primary rider/customer device), with iOS support as a should-have.

## 3.8 Compliance
- **NFR-COMP-01**: System shall comply with the Philippine Data Privacy Act of 2012 (RA 10173) principles: transparency, legitimate purpose, proportionality, and shall provide data subject access/erasure request handling.
- **NFR-COMP-02**: Invoice numbering shall follow BIR sequential numbering rules (no gaps, no reuse, void tracking retained not deleted).
- **NFR-COMP-03**: Financial data shall be retained for a minimum of 10 years (or per local statutory requirement) before archival/purge.

## 3.9 Observability
- **NFR-OBS-01**: System shall expose health-check endpoints for uptime monitoring.
- **NFR-OBS-02**: System shall integrate with an error-tracking service (e.g., Sentry-equivalent) to capture unhandled exceptions with context.
- **NFR-OBS-03**: System shall log structured events (JSON logs) for key business transactions to support operational analytics.

## 3.10 Disaster Recovery
- **NFR-DR-01**: Recovery Point Objective (RPO): ≤ 24 hours.
- **NFR-DR-02**: Recovery Time Objective (RTO): ≤ 4 hours for core POS/sales functionality.
- **NFR-DR-03**: Offsite/cloud backup storage shall be geographically separate from the primary hosting region where feasible.
