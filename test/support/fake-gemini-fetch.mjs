// Preloaded with `node --import` into the real judge scripts: records every Gemini request
// (URL + parsed body) to $FAKE_FETCH_LOG and answers with an empty JSON candidate. No network.
import { appendFileSync } from "node:fs";
globalThis.fetch = async (url, init = {}) => {
  appendFileSync(process.env.FAKE_FETCH_LOG, JSON.stringify({ url: String(url), body: JSON.parse(init.body ?? "null") }) + "\n");
  const payload = { candidates: [{ content: { parts: [{ text: "{}" }] } }] };
  return { ok: true, status: 200, json: async () => payload, text: async () => JSON.stringify(payload) };
};
