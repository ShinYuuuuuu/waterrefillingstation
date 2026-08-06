# AI Project Rules

This document defines the coding standards, naming conventions, architecture rules, database rules, security rules, and continuation instructions for the Water Station Management System (WSMS). Any AI agent working on this project must read and follow these rules before writing any code.

---

## 1. Coding Standards

### 1.1 Language & Runtime

- **Backend**: TypeScript (Node.js) or Go. The project uses `main.go` as the primary backend entry point per the folder architecture. If TypeScript is chosen, the entry point is `app.ts` or `index.ts`.
- **Frontend**: TypeScript with React. Entry point is `App.tsx`.
- **Mobile**: TypeScript with React Native (primary) or Dart with Flutter. Entry point is `App.js` or `main.dart`.
- **Database**: PostgreSQL.
- **Migrations**: Versioned, reversible migration scripts.

### 1.2 Code Quality

- All code must compile without errors or warnings.
- No `TODO` comments in production code unless explicitly requested as a tracked task.
- No commented-out code.
- No hardcoded secrets, API keys, or credentials.
- All magic numbers must be named constants.
- Functions must be pure where possible; side effects must be explicit and isolated.
- Error handling must be exhaustive — no swallowed errors, no bare `catch` blocks without logging.

### 1.3 Error Handling

- Use typed error classes (e.g., `AppError`, `ValidationError`, `NotFoundError`, `PermissionError`).
- Every function that can fail must return a `Result<T, E>` type or throw a typed error.
- Errors must include context (input values, operation name, timestamp) for debugging.
- Never expose raw error messages or stack traces to clients in production.

### 1.4 Logging

- Use structured JSON logging for all business transactions.
- Log levels: `error`, `warn`, `info`, `debug`.
- Never log PII, passwords, tokens, or full payment card numbers.
- Mask sensitive fields in logs (e.g., `**** **** **** 1234`).

### 1.5 Testing

- Unit tests for all business logic (minimum 70% coverage for critical paths: inventory ledger, payment calculation, credit limit enforcement).
- Integration tests for API endpoints and database operations.
- Test files must be colocated with source files (e.g., `user.service.ts` and `user.service.test.ts`).
- Use the same testing framework consistently across all modules.

---

## 2. Naming Conventions

### 2.1 General

- Use **camelCase** for variables, functions, and method names.
- Use **PascalCase** for class names, type names, interface names, and enum names.
- Use **UPPER_SNAKE_CASE** for constants.
- Use **kebab-case** for file and directory names.
- Use **snake_case** for database table and column names.

### 2.2 Files & Directories

- Source files: `kebab-case.ts` or `kebab-case.js` (e.g., `sales-transaction.service.ts`).
- Test files: same name with `.test.ts` or `.spec.ts` suffix (e.g., `sales-transaction.service.test.ts`).
- Directory names: `kebab-case` (e.g., `sales-transactions`, `customer-management`).
- Index files: `index.ts` per module directory for barrel exports.

### 2.3 Database

- Tables: `snake_case`, plural (e.g., `sales_transactions`, `customers`, `delivery_orders`).
- Columns: `snake_case` (e.g., `created_at`, `updated_at`, `quantity_on_hand`).
- Primary keys: `id` (UUID or bigint, consistent per project).
- Foreign keys: `<referenced_table>_id` (e.g., `customer_id`, `branch_id`).
- Timestamps: `created_at`, `updated_at` on every table.
- Soft deletes: `deleted_at` (nullable timestamp).
- Tenant/branch scoping: `tenant_id` and `branch_id` on all multi-tenant tables.

### 2.4 API

- Routes: `kebab-case` plural nouns (e.g., `/api/v1/sales-transactions`, `/api/v1/customers`).
- Route parameters: `:paramName` in camelCase (e.g., `:customerId`).
- Response fields: `camelCase`.
- Request body fields: `camelCase`.
- Error response shape: `{ error: { code: string, message: string, details?: unknown } }`.

### 2.5 Frontend

- Components: `PascalCase` (e.g., `SalesTransactionForm`, `CustomerProfileCard`).
- Hooks: `useCamelCase` (e.g., `useSalesTransactions`, `useCustomerProfile`).
- Utility functions: `camelCase` (e.g., `formatCurrency`, `calculateChange`).
- CSS/style files: co-located with component, named `ComponentName.module.css` or `ComponentName.styles.ts`.

### 2.6 Constants & Enums

- Enums: `PascalCase` singular (e.g., `PaymentMethod`, `OrderStatus`, `CustomerType`).
- Enum values: `UPPER_SNAKE_CASE` (e.g., `PaymentMethod.CASH`, `OrderStatus.DELIVERED`).
- Config constants: `UPPER_SNAKE_CASE` (e.g., `MAX_LOGIN_ATTEMPTS`, `SESSION_TIMEOUT_MINUTES`).

---

## 3. Architecture Rules

### 3.1 Overall Architecture

- **Backend**: Layered architecture with strict separation of concerns:
  - `api/` — REST controllers/routes (thin, delegates to application layer).
  - `application/` — Use cases, business logic, orchestration.
  - `domain/` — Core entities, value objects, aggregates, domain events.
  - `infrastructure/` — Database repositories, external service clients, message queues.
  - `shared/` — Cross-cutting utilities (logging, auth middleware, types, errors).
- **Frontend**: Component-based React application with state management (Redux, Zustand, or equivalent).
- **Mobile**: Separate app (React Native or Flutter) for riders and customers.

### 3.2 Module Boundaries

- Each business domain (sales, inventory, customers, payments, delivery, etc.) must be a self-contained module.
- Modules communicate through well-defined interfaces (ports/adapters pattern).
- No module may directly access another module's internal data structures.
- Shared kernel (common types, utilities) lives in `shared/`.

### 3.3 Dependency Direction

- Dependencies must point inward:
  - `api` depends on `application`.
  - `application` depends on `domain`.
  - `infrastructure` implements `domain` interfaces.
  - `shared` has no dependencies on other layers.
- No circular dependencies between modules.

### 3.4 Offline-First Design

- POS and rider apps must function fully offline.
- Local queue for transactions and status updates.
- Auto-sync when connectivity is restored.
- Idempotency keys on all mutating operations to prevent duplicates on sync.
- Conflict resolution strategy: last-write-wins for non-financial data; manual review for financial data.

### 3.5 Multi-Tenancy / Multi-Branch

- Every data table that is branch-scoped must include `tenant_id` and `branch_id`.
- API must enforce branch scoping at the data access layer — never trust client-side filtering alone.
- HQ/Owner role sees consolidated data across all branches.
- Branch Manager sees only their branch's data.

### 3.6 No New Dependencies Without Approval

- Before adding any new npm package, library, or framework, verify that the project does not already include an equivalent solution.
- New dependencies must be documented in the settings module and justified by a specific requirement.
- Prefer standard library or built-in solutions over third-party packages.

---

## 4. Database Rules

### 4.1 Schema Design

- Use PostgreSQL with proper data types (no generic `TEXT` where a specific type fits).
- Use `UUID` for primary keys where globally unique identifiers are needed; use `BIGSERIAL` for local-only IDs.
- Use `TIMESTAMPTZ` for all datetime columns (never `TIMESTAMP WITHOUT TIME ZONE`).
- Use `NUMERIC(12,2)` or `DECIMAL(12,2)` for monetary values (never `FLOAT` or `DOUBLE`).
- Use `BOOLEAN` for flags (never `TINYINT` or `CHAR(1)`).
- Use `JSONB` for flexible metadata where schema rigidity is unnecessary.

### 4.2 Constraints & Integrity

- Every table must have a primary key.
- Foreign keys must be enforced at the database level.
- `NOT NULL` constraints on all columns that should never be empty.
- `UNIQUE` constraints on all fields that must be unique (email, SKU, invoice number, etc.).
- `CHECK` constraints for valid ranges and enumerations (e.g., `status IN ('active', 'inactive')`).
- Use database transactions for all multi-step operations that must be atomic.

### 4.3 Migrations

- All schema changes must be done via versioned migration scripts.
- Migrations must be reversible (include `DOWN` or rollback SQL).
- Migration files follow the naming convention: `YYYYMMDDHHMMSS_description.sql` (e.g., `20260803140000_add_customer_credit_limit.sql`).
- Migrations are applied via a migration tool (e.g., `dbmate`, `flyway`, or `knex`).
- Never manually modify the database schema outside of migrations.

### 4.4 Indexing

- Index all foreign key columns.
- Index all columns used in `WHERE`, `JOIN`, `ORDER BY`, and `GROUP BY` clauses on frequently queried tables.
- Use composite indexes for common query patterns (e.g., `(branch_id, created_at)` for sales reports).
- Monitor query performance and add indexes as needed based on real usage patterns.

### 4.5 Data Retention & Soft Deletes

- Use soft deletes (`deleted_at` timestamp) for all transactional data. Never hard-delete financial or inventory records.
- Archive old transactions (older than the retention period defined in `23-settings-modules.md`) to a separate archive schema or table.
- Financial data must be retained for a minimum of 10 years per NFR-COMP-03.

### 4.6 Multi-Branch Data Isolation

- Every table that stores branch-scoped data must include `branch_id`.
- The `tenant_id` column is used for multi-tenant SaaS deployments (super admin level).
- Queries must always filter by `tenant_id` and `branch_id` unless explicitly querying across branches (HQ/Owner role only).

---

## 5. Security Rules

### 5.1 Authentication

- Use JWT for API authentication. Access tokens: short-lived (15-30 minutes). Refresh tokens: long-lived (7-30 days), stored securely.
- Passwords must be hashed with Argon2 or bcrypt with per-user salt. Never store plaintext passwords.
- PINs for POS quick re-authentication must be hashed the same way as passwords.
- MFA (TOTP or SMS OTP) must be supported for Owner, Accountant, and Super Admin roles.
- Rate limiting on login endpoints: 5 attempts per IP/username per 15 minutes. Account lockout after 5 failures for 15 minutes.

### 5.2 Authorization

- RBAC is enforced server-side on every API endpoint. Never trust client-side role checks alone.
- Branch-level scoping: users can only access data for their assigned branch(es) unless they hold an HQ/Super Admin role.
- Approval workflows for sensitive operations (voids, refunds, credit limit increases, stock write-offs) require manager/owner PIN override.

### 5.3 Data Protection

- All client-server communication must use HTTPS/TLS 1.2+.
- PII and payment-related fields must be encrypted at rest (column-level encryption for highly sensitive fields).
- Sensitive data must be masked in logs and UI (e.g., `**** **** **** 1234` for card numbers).
- API keys for external integrations (GCash, Maya, SMS gateways) must be stored in environment variables or a secrets manager — never in source code or config files committed to version control.

### 5.4 Input Validation

- All user inputs must be validated on the server side. Never trust client-side validation alone.
- Use whitelist-based validation for all user-provided data.
- Parameterized queries or ORM must be used for all database operations to prevent SQL injection.
- Output encoding must be applied to prevent XSS in web responses.

### 5.5 Audit & Compliance

- Every create, update, delete, void, and login event must be logged in an audit trail with user ID, timestamp, IP address, and before/after values.
- Invoice numbers must be sequential, non-reusable, and tamper-evident (BIR-compliant).
- Financial transactions must be immutable — updates must create new records with audit trail, never overwrite existing records.
- Data privacy must comply with RA 10173 (Philippine Data Privacy Act) principles: transparency, legitimate purpose, proportionality, data subject access/erasure.

### 5.6 Session Management

- JWTs are stateless; backend validates token signature and expiry.
- Refresh tokens are stored server-side and invalidated on logout, password change, or explicit revocation.
- Automatic session expiration after a configurable inactivity period.
- Secure cookies for web clients: `HttpOnly`, `Secure`, `SameSite=Strict`.

---

## 6. How Future AI Agents Should Continue This Project

### 6.1 Before Starting Any Task

1. **Read this file** (`AI_PROJECT_RULES.md`) in full.
2. **Read the overview** (`docs/00-overview.md`) to understand the project scope and document index.
3. **Read the SRS** (`docs/01-srs.md`) and **Functional Requirements** (`docs/02-functional-requirements.md`) to understand what the system must do.
4. **Read the relevant process documents** in `docs/` (e.g., `18-inventory-process.md`, `19-delivery-process.md`, `20-sales-process.md`, `21-customer-management.md`, `22-payment-process.md`, `23-settings-modules.md`) for the domain you are working on.
5. **Read the architecture documents** (`09-folder-architecture.md`, `10-api-design.md`, `11-security-design.md`, `12-ui-sitemap.md`) to understand the intended structure and patterns.
6. **Inspect the codebase** to understand what already exists and what is missing.
7. **Do not delete or overwrite existing work** without explicit approval.

### 6.2 When Writing Code

1. **Follow the coding standards** in Section 1 of this document.
2. **Follow the naming conventions** in Section 2 of this document.
3. **Follow the architecture rules** in Section 3 of this document.
4. **Follow the database rules** in Section 4 of this document.
5. **Follow the security rules** in Section 5 of this document.
6. **Write tests** for all new business logic.
7. **Update the relevant documentation** in `docs/` when you add new features, change existing ones, or modify the architecture.
8. **Do not write application code yet** unless explicitly instructed to do so. The project is currently in the specification/documentation phase.

### 6.3 When Adding New Features

1. **Check the feature catalog** (`docs/13-features-catalog.md`) to see if the feature is already documented.
2. **Update the functional requirements** (`docs/02-functional-requirements.md`) with new requirement IDs following the `FR-<Module>-<Number>` pattern.
3. **Update the database design** (`docs/07-database-design.md`) if new tables or columns are needed.
4. **Update the API design** (`docs/10-api-design.md`) if new endpoints are needed.
5. **Update the UI sitemap** (`docs/12-ui-sitemap.md`) if new screens are needed.
6. **Update the features catalog** (`docs/13-features-catalog.md`) to include the new feature.
7. **Update the document index** in `docs/00-overview.md` if new documents are added.

### 6.4 When Modifying Existing Documents

1. **Preserve existing content** — do not delete or overwrite without approval.
2. **Intelligently merge or improve** existing content while preserving custom content.
3. **Maintain document numbering** — the next available number in the sequence.
4. **Update the document index** in `docs/00-overview.md` when documents are added, removed, or renamed.

### 6.5 Project Continuation Checklist

Before handing off or pausing work, ensure:

- [ ] All new code follows the coding standards in this document.
- [ ] All new code has appropriate tests.
- [ ] All new features are documented in the relevant `docs/` files.
- [ ] The document index in `docs/00-overview.md` is up to date.
- [ ] No existing files were deleted or overwritten without approval.
- [ ] No secrets or credentials were committed to the repository.
- [ ] The project remains in a buildable/verifiable state (if code exists).