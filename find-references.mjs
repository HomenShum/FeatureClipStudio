// Find reference demo videos, watch them, and write down what they DO — with timestamps.
//
//   node find-references.mjs "Raycast product demo" "Linear product demo"
//   node find-references.mjs --url=https://youtu.be/Mi173xGb0ZA
//   REFERENCE_MAX_SECONDS=120 node find-references.mjs "Figma launch"
//   node find-references.mjs --refresh --url=<url>   (re-watch even if already observed)
//
// Why this exists rather than a curated list somebody pastes in. A reference written as prose —
// "their pacing is good" — cannot score anything. Mobbin works because each entry is an ATOMIC FACT
// with a locator: the specific thing, and where you saw it. For video the locator is a TIMESTAMP.
// So this searches, watches, and records facts in that shape, and the corpus it writes is what
// judge-video.mjs compares a candidate against.
//
// NOTHING IS DOWNLOADED. yt-dlp is used only to SEARCH and read metadata; Gemini watches the URL
// directly. So a reference is cited, never copied, and the licence question never arises — the
// corpus stores observations and a link, not footage.
//
// Cost is the reason for the duration filter. Prompt tokens scale with runtime: an 18-minute video
// measured 102k tokens, a 39-second one under 4k. A keynote is also the wrong SHAPE to learn a
// 45-second walkthrough from, so the default ceiling is both a cost control and a taste control.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT_DIR = "references/video";
const LEDGER = "references/video/ledger.json";

// The corpus is CUMULATIVE, and the ledger is what makes it so. Two different things must survive a
// re-run, and only one of them is obvious:
//
//   OBSERVED   a video already watched. Re-watching costs tokens and returns the same facts, so a
//              match is reused. The identity is the video id PLUS the prompt and model that
//              produced the observation — a fact observed under an older prompt is not the same
//              fact, and silently reusing it would be a stale measurement.
//   REJECTED   a video already triaged away, and WHY. Without this, every search re-prints the same
//              four keynotes and a reader re-decides a decision that was already made. The reason
//              is kept because "which survived" without "why the others did not" is half a record.
//
// Discovery is not blocked by either: a query that returns something new still gets watched, and
// --refresh re-observes a specific video when the prompt or the video itself has moved on.
const OBSERVE_VERSION = "2026-08-03.atomic-facts-v1";

function loadLedger() {
  try { return JSON.parse(readFileSync(LEDGER, "utf8")); }
  catch { return { schemaVersion: "featureclip.reference-ledger/v1", observed: {}, rejected: {} }; }
}

/** Identity of an observation: the video, under a specific prompt and model. */
const observationKey = (url, model) => `${videoId(url)}::${OBSERVE_VERSION}::${model}`;

function videoId(url) {
  const m = /(?:youtu\.be\/|[?&]v=|\/shorts\/)([\w-]{6,})/.exec(String(url));
  return m ? m[1] : String(url);
}
const MAX_SECONDS = Number.parseInt(process.env.REFERENCE_MAX_SECONDS ?? "180", 10);
const PER_QUERY = Number.parseInt(process.env.REFERENCE_PER_QUERY ?? "4", 10);
const MODEL = process.env.GEMINI_JUDGE_MODEL || "gemini-3.6-flash";

const key = () => {
  for (const k of ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"]) if (process.env[k]) return process.env[k];
  for (const f of [".env.local", ".env", "../noderoom/.env.local"]) {
    if (!existsSync(f)) continue;
    const m = readFileSync(f, "utf8").match(/^(?:GEMINI_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY)=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY");
};

/** Search YouTube. Metadata only — yt-dlp never fetches a stream here. */
function search(query, limit = PER_QUERY) {
  const run = spawnSync("yt-dlp", [
    `ytsearch${limit}:${query}`, "--flat-playlist", "--no-warnings",
    "--print", "%(duration)s\t%(channel)s\t%(title)s\thttps://youtu.be/%(id)s",
  ], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, timeout: 120_000 });
  if (run.status !== 0) return [];
  return run.stdout.split("\n").filter(Boolean).map((line) => {
    const [duration, channel, title, url] = line.split("\t");
    return { seconds: Number.parseInt(duration, 10), channel, title, url };
  }).filter((c) => Number.isInteger(c.seconds));
}

/**
 * Is this worth spending tokens on? Applied BEFORE watching, because the filter is the point: a
 * 28-minute keynote costs five times an eligible clip and teaches the wrong shape anyway.
 */
function triage(candidate, ledger) {
  const prior = ledger.rejected[videoId(candidate.url)];
  // Already decided. Re-deciding it prints noise and invites a different answer to the same input.
  if (prior) return `${prior.reason} (recorded ${prior.at.slice(0, 10)})`;
  if (candidate.seconds > MAX_SECONDS) return `${candidate.seconds}s exceeds the ${MAX_SECONDS}s ceiling — wrong shape and wrong cost for a short walkthrough`;
  if (candidate.seconds < 10) return `${candidate.seconds}s is too short to contain a flow`;
  // A first-party channel is the strongest available signal that this is the product's own framing
  // rather than a third-party review. Recorded, not enforced — the caller may want a critique.
  return null;
}

const OBSERVE = `Watch this product demo video and record ATOMIC FACTS about how it is BUILT.
Every fact needs a timestamp. This is a craft reference for making a short product walkthrough, so
record what a maker could copy or deliberately avoid — not what the product does.

Rules:
- A fact is specific and checkable at its timestamp. "at 0:04 the first UI appears, 4s after the
  title card" is a fact. "the intro is snappy" is not.
- Report SECONDS for anything you measure, not adjectives.
- If you cannot determine something, say so in notRun rather than estimating.

Return STRICT JSON:
{"watched":true,
 "runtimeSeconds":n,
 "hookSeconds":n,                  // seconds before the product itself is first on screen
 "singleMoment":{"ts":"m:ss","what":"the one thing this video is built around"},
 "facts":[{"id":"f1","ts":"m:ss","kind":"pacing|motion|caption|state|audio|structure",
           "subject":"what part of the video","property":"what about it","value":"the measurement or specific behaviour"}],
 "statesShown":["empty","loading","result","error"],
 "motionPurpose":"what camera or transition movement is used FOR, with a timestamp",
 "whatToSteal":{"ts":"m:ss","technique":"one concrete transferable technique"},
 "whatNotToSteal":{"ts":"m:ss","why":"something that would be dishonest or wrong for a small product"},
 "notRun":["anything you could not determine from the video"]}`;

async function observe(url) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key()}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ file_data: { file_uri: url } }, { text: OBSERVE }] }],
      generationConfig: { temperature: 0.2, response_mime_type: "application/json" },
    }),
  });
  const body = await res.json();
  if (!res.ok || body.error) return { error: `${res.status}: ${(body.error?.message ?? "").slice(0, 120)}` };
  const parts = body.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("");
  // A URL that cannot be watched returns prose with no VIDEO modality rather than an error, and an
  // observation invented from a title is worse than none. Absence of the modality is the tell.
  const sawVideo = (body.usageMetadata?.promptTokensDetails ?? []).some((d) => d.modality === "VIDEO");
  if (!sawVideo) return { error: "no VIDEO modality in the response — the URL was not actually watched" };
  try {
    return { observation: JSON.parse(text), tokens: body.usageMetadata?.promptTokenCount ?? null };
  } catch {
    return { error: `unparseable observation: ${text.slice(0, 100)}` };
  }
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

const run = async () => {
  const args = process.argv.slice(2);
  const refresh = args.includes("--refresh");
  const ledger = loadLedger();
  const urls = args.filter((a) => a.startsWith("--url=")).map((a) => a.slice(6));
  const queries = args.filter((a) => !a.startsWith("--"));
  if (urls.length === 0 && queries.length === 0) {
    console.error('usage: node find-references.mjs "<search query>" [...] [--url=<youtube-url>]');
    process.exit(2);
  }

  const candidates = [...urls.map((url) => ({ url, seconds: null, channel: "(direct)", title: url }))];
  for (const q of queries) {
    const found = search(q);
    console.log(`[search] "${q}" -> ${found.length} result(s)`);
    for (const c of found) {
      const why = triage(c, ledger);
      console.log(`  ${why ? "skip" : "KEEP"}  ${String(c.seconds).padStart(4)}s  ${c.channel} — ${c.title.slice(0, 46)}${why ? `\n         ${why}` : ""}`);
      if (!why) candidates.push(c);
      else if (!ledger.rejected[videoId(c.url)]) {
        ledger.rejected[videoId(c.url)] = { url: c.url, title: c.title, seconds: c.seconds, reason: why, at: new Date().toISOString() };
      }
    }
  }
  if (candidates.length === 0) {
    console.error("no candidate survived triage; widen REFERENCE_MAX_SECONDS or change the query");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const written = [];
  const reused = [];
  for (const c of candidates) {
    const cacheKey = observationKey(c.url, MODEL);
    const hit = ledger.observed[cacheKey];
    if (hit && !refresh && existsSync(hit.file)) {
      reused.push(hit);
      console.log(`[cached] ${c.url} — ${hit.factCount} facts, observed ${hit.at.slice(0, 10)} (--refresh to re-watch)`);
      continue;
    }
    process.stdout.write(`[watch] ${c.url} `);
    const { observation, error, tokens } = await observe(c.url);
    if (error) { console.log(`SKIPPED — ${error}`); continue; }
    const record = {
      schemaVersion: "featureclip.video-reference/v1",
      referenceId: slug(`${c.channel}-${c.title}`),
      source: { url: c.url, channel: c.channel, title: c.title, declaredSeconds: c.seconds },
      // Cited, never copied: this file holds observations and a link. No footage is stored, so
      // there is no licence to review — the same reason Mobbin is a corpus and not a mirror.
      licence: "observed-and-attributed: cited by URL and timestamp, never re-hosted",
      observedAt: new Date().toISOString(),
      observedBy: MODEL,
      promptTokens: tokens,
      ...observation,
    };
    const file = path.join(OUT_DIR, `${record.referenceId}.json`);
    writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    written.push({ file, record });
    ledger.observed[cacheKey] = {
      file, url: c.url, referenceId: record.referenceId,
      factCount: observation.facts?.length ?? 0, promptTokens: tokens,
      observeVersion: OBSERVE_VERSION, model: MODEL, at: record.observedAt,
    };
    console.log(`ok — ${observation.facts?.length ?? 0} facts, hook ${observation.hookSeconds}s, ${tokens} tokens`);
  }

  // Persisting the ledger is the whole feature. It was populated in memory and never written, so
  // every run started from empty and re-watched what it already knew — a cache that reads and never
  // writes is indistinguishable from no cache, and its logs look identical to a working one.
  writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
  const savedTokens = reused.reduce((total, entry) => total + (entry.promptTokens ?? 0), 0);
  console.log(
    `\n${written.length} new, ${reused.length} reused${savedTokens ? ` (~${savedTokens} prompt tokens not respent)` : ""}, `
    + `${Object.keys(ledger.rejected).length} rejected on record.`,
  );
  console.log(`corpus ${OUT_DIR}/ · ledger ${LEDGER}`);
  for (const { record } of written) {
    console.log(`  ${record.referenceId}`);
    console.log(`    single moment  ${record.singleMoment?.ts} — ${record.singleMoment?.what}`);
    console.log(`    steal          ${record.whatToSteal?.ts} — ${record.whatToSteal?.technique}`);
  }
  // Reused counts as success: a run that found everything already known did its job.
  if (written.length === 0 && reused.length === 0) process.exitCode = 1;
};

run().catch((error) => { console.error(error.message); process.exit(1); });
