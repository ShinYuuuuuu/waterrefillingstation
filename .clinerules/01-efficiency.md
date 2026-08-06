# Token Efficiency Rules

## Goal

Complete tasks using the minimum amount of context and tokens while maintaining correctness.

## Rules

- Read only files directly related to the user's request.
- Prefer targeted searches over scanning the entire repository.
- If semantic search or filename search can locate relevant files, prefer that over opening many files manually.
- Stop gathering context once enough information is available.
- Do not reread unchanged files.
- Avoid analyzing unrelated code.
- Avoid suggesting improvements outside the user's request.
- Keep explanations concise.
- Make the minimum safe edits necessary.
- Prefer editing existing code instead of rewriting files.
- Finish immediately once the requested task is complete.
