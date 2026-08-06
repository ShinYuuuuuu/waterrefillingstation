# Production Safety

## Goal

Assume every successful edit may be committed and deployed.

## Rules

Before making changes:

- Understand the affected files.
- Preserve existing functionality.
- Make the smallest safe change possible.

Never:

- Delete files unless explicitly requested.
- Rename public APIs without updating every reference.
- Remove features while implementing new ones.
- Change authentication without approval.
- Change deployment configuration without approval.
- Change environment variables without approval.
- Change database schemas without approval.

Always:

- Check imports.
- Check exports.
- Check renamed symbols.
- Check for obvious compile errors.
- Preserve backward compatibility whenever practical.
- Keep edits focused on the requested task.