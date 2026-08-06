# puter-test

A minimal Node.js project demonstrating how to use the [`@heyputer/puter.js`](https://www.npmjs.com/package/@heyputer/puter.js) SDK to interact with the [Puter](https://puter.com) cloud platform from Node.js.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or newer recommended)
- A Puter account. Sign up at [puter.com](https://puter.com).

### Installation

```bash
npm install
```

### Configuration

The Puter SDK uses a **User-Pays Model** — there are no API keys to manage.
Each API call is billed to the authenticated Puter user.

The Node.js entry point (`src/init.cjs`) accepts an auth token in two ways:

1. **Environment variable (recommended for CI / non-interactive use):**
   ```bash
   $env:PUTER_AUTH_TOKEN="your-auth-token"   # Windows PowerShell
   # or
   set PUTER_AUTH_TOKEN=your-auth-token       # Windows cmd
   # or
   export PUTER_AUTH_TOKEN=your-auth-token    # macOS / Linux
   ```
   You can obtain a token from the [Puter dashboard](https://puter.com/dashboard/)
   or by signing in once via the browser flow below.

2. **Interactive browser login (no env var set):**
   If `PUTER_AUTH_TOKEN` is not set, the script automatically opens a browser
   window so you can sign in to Puter and authorize the app.

### Running

```bash
node index.js
```

With a token in the environment:
```bash
$env:PUTER_AUTH_TOKEN="your-token"; node index.js
```

Or let the browser handle authentication interactively:
```bash
node index.js
```

Expected output (truncated — the full run prints the raw response object, the extracted message, and all metadata fields):
```
Sending prompt to Puter AI...

=== Raw Response Object ===
{ message: { role: 'assistant', content: 'gpt-5-nano\n' }, choices: ..., ... }

=== Extracted Message ===
{
  "role": "assistant",
  "content": "gpt-5-nano"
}

=== Metadata ===
choices: { model: 'gpt-5-nano', usage: { ... }, ... }
```

## Project Structure

```
puter-test/
├── README.md        # This file
├── index.js         # Entry point — Puter AI chat model introspection
├── .gitignore
├── package.json
├── package-lock.json
└── node_modules/
```

## License

ISC
