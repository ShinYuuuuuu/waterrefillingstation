/**
 * Puter AI Chat Example — Model Introspection (Node.js)
 *
 * Sends a prompt that asks the AI to identify which model it is, then prints
 * the raw response object, the extracted assistant message, and all metadata
 * returned by the SDK.
 *
 * Official docs: https://docs.puter.com/AI/chat/
 * Response type: https://docs.puter.com/Objects/chatresponse/
 */

// Import the Node.js-specific helpers from the Puter SDK.
//   - init:        Loads the SDK into an isolated context and returns an
//                  authenticated `puter` instance when given an auth token.
//   - getAuthToken: Interactive browser-based OAuth flow that returns a token.
//
// This is the documented (non-deprecated) entry point for Node.js:
//   https://docs.npmjs.com/package/@heyputer/puter.js
const { init, getAuthToken } = require('@heyputer/puter.js/src/init.cjs');

// The prompt asks the model to self-identify so the reported model name can
// be cross-checked against the SDK-returned metadata below.
const prompt = 'State the exact AI model you are using to answer this request. Reply with only the model name.';

async function main() {
  // --- Step 1: Obtain a Puter auth token ---
  // Try the environment variable first (non-interactive / CI-friendly path).
  // The SDK README also reads `process.env.puterAuthToken`, so support both.
  let authToken = process.env.PUTER_AUTH_TOKEN || process.env.puterAuthToken;

  if (!authToken) {
    // No token in the environment — fall back to the browser OAuth flow.
    // getAuthToken() spawns a local HTTP server, opens the default browser to
    // https://puter.com, and resolves with the token once the user signs in.
    console.log('No PUTER_AUTH_TOKEN found. Opening browser for sign-in...');
    authToken = await getAuthToken();
  }

  // --- Step 2: Initialize the Puter SDK ---
  // init() reads the pre-built dist/puter.cjs into a fresh VM context and, when
  // given a token, calls puter.setAuthToken() so every subsequent API call is
  // authenticated.
  const puter = init(authToken);

  // --- Step 3: Send the chat request ---
  // puter.ai.chat(prompt) returns Promise<ChatResponse>.
  // The string-only overload routes through the default model (gpt-5-nano per
  // the official docs) and does not enable streaming.
  // Docs: https://docs.puter.com/AI/chat/
  console.log('Sending prompt to Puter AI...');
  const response = await puter.ai.chat(prompt);

  // --- Step 4a: Print the raw response object ---
  // The full ChatResponse as returned by the SDK driver — includes the message,
  // provider-native `choices`, and any optional fields such as `compaction`.
  // Docs: https://docs.puter.com/Objects/chatresponse/
  console.log('\n=== Raw Response Object ===');
  console.log(response);

  // --- Step 4b: Print the extracted assistant message ---
  // `response.message` is the assistant turn; `.content` holds the text reply.
  console.log('\n=== Extracted Message ===');
  console.log(JSON.stringify(response.message, null, 2));

  // --- Step 4c: Print all SDK-returned metadata ---
  // The ChatResponse carries provider-native data in `choices` (model name,
  // token usage, finish reason, etc.) and optional fields like `compaction`.
  // We iterate every own key on the response, skipping the message (already
  // printed) and the convenience `toString`/`valueOf` accessors that the SDK
  // attaches to the object.
  console.log('\n=== Metadata ===');
  const skipKeys = new Set(['message', 'toString', 'valueOf']);
  for (const key of Object.keys(response)) {
    if (!skipKeys.has(key)) {
      console.log(`${key}:`, response[key]);
    }
  }
}

// Run the example, surfacing any errors with a non-zero exit code.
main().catch((err) => {
  console.error('Error:', err.message);
  process.exitCode = 1;
});
