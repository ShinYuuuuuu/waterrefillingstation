# Project Conventions

## Purpose

Adapt to the existing project instead of imposing external preferences. Every project has its own conventions, and Cline should follow them.

## Detect the Project First

Before making any change, identify:

- The programming language(s) used.
- The framework(s) and their versions.
- The architecture (monolith, microservices, layered, etc.).
- The build and test tooling.
- The existing coding conventions and patterns.

Do this by reading `package.json`, `pom.xml`, `go.mod`, `requirements.txt`, `Cargo.toml`, or equivalent project files.

## Follow Existing Coding Style

- Match the indentation, spacing, and formatting already in use.
- Follow the project's linting and formatting rules.
- Do not introduce a new style guide.

## Match Project Structure

- Place new files in locations consistent with the existing folder structure.
- Do not reorganize folders unless explicitly requested.
- Follow the same module and directory naming conventions.

## Match Naming Conventions

- Use the same naming patterns for variables, functions, classes, and files.
- Do not introduce new naming styles.

## Match Formatting and Linting Rules

- Follow the project's existing formatting configuration.
- Respect the project's linting rules and settings.
- Do not introduce new linting or formatting tools.

## Match Error Handling Style

- Use the same error handling approach already in the codebase (e.g., exceptions, result types, error codes).
- Follow the same patterns for logging and reporting errors.

## Match State Management, Dependency Injection, Routing, and Service Patterns

- Use the same state management approach already in the project (e.g., Redux, Context, signals, services).
- Use the same dependency injection pattern already in use.
- Follow the same routing conventions already established.
- Follow the same service layer patterns already in place.
- Do not introduce a second state management solution, dependency injection pattern, routing approach, or service pattern.

## Reuse Existing Code

- Use existing utilities, components, services, helpers, and abstractions.
- Do not duplicate functionality.
- Do not create new abstractions when existing ones serve the purpose.

## Check Before Creating

- Before creating a new file, check whether an appropriate file already exists.
- Before creating a new component, check for reusable components.
- Before installing a new dependency, determine whether the project already includes an equivalent solution.

## One Pattern Per Thing

- Avoid introducing a second pattern when the project already has an established one.
- Prefer consistency over personal preference.

## Backward Compatibility

- Preserve backward compatibility whenever practical.
- Do not remove or change existing public interfaces without explicit request.

## Documentation

- Write documentation only when it helps the project.
- Do not over-document trivial code.
- Document non-obvious behavior and public APIs.

## Simplicity

- Keep implementations simple, maintainable, and aligned with the repository.
- Do not over-engineer.
- Solve the problem with the least amount of code necessary.