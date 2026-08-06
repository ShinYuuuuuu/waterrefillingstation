# Engineering Standards

## SOLID

- Single Responsibility: Each function and module should have one clear purpose.
- Open/Closed: Extend behavior without modifying existing code when possible.
- Liskov Substitution: Subtypes should be usable wherever their base types are expected.
- Interface Segregation: Prefer small, focused interfaces over large, general ones.
- Dependency Inversion: Depend on abstractions, not concretions.

## DRY

- Avoid duplicating logic.
- Extract shared logic into reusable functions or modules.
- Do not over-abstract; duplication is acceptable when it increases clarity.

## KISS

- Keep implementations as simple as possible.
- Avoid unnecessary complexity.
- Prefer straightforward solutions over clever ones.

## Modular Design

- Organize code into cohesive modules with clear boundaries.
- Minimize coupling between modules.
- Expose clean, well-defined interfaces.

## Reusable Code

- Write functions and components that can be reused.
- Parameterize behavior instead of duplicating code.
- Avoid hardcoding values that may change.

## Proper Naming

- Use descriptive, meaningful names.
- Follow the project's naming conventions.
- Names should reveal intent.

## Validation

- Validate all external inputs.
- Fail early with clear error messages.
- Do not trust user-provided data.

## Error Handling

- Handle errors gracefully.
- Provide meaningful error messages.
- Do not silently swallow errors.
- Use appropriate error types for different failure modes.

## Logging

- Log important events and errors.
- Include enough context to diagnose issues.
- Do not log sensitive data.
- Use consistent log formats.

## Clean Architecture

- Separate concerns into distinct layers.
- Keep business logic independent of infrastructure.
- Dependency flow should point inward toward domain logic.

## Maintainability

- Write code that is easy to test, debug, and extend.
- Keep cyclomatic complexity low.
- Document non-obvious decisions.