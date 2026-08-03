// Self-judge — Gemini video understanding watches the RENDERED walkthrough and scores it against
// the anti-hero-shot quality bar, with timestamped defects. The final cut stops being the one
// stage only human eyes ever check.
//
//   node judge-video.mjs out/example.mp4            (writes out/example.judge.md + .judge.json)
//   node find-references.mjs "<query>"              (build the reference corpus first — it is used
//                                                    automatically; --no-reference opts out)
//   GEMINI_JUDGE_MODEL=gemini-3.5-flash node judge-video.mjs renders/feature.mp4   (pin an older judge)
//
// Judge the MP4 (the pre-palette render), not the GIF — GIF is not a supported video MIME for
// Gemini; the MP4 has identical content plus the audio track if you added narration.
// Key: GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY (env, or a local .env/.env.local line).
// Severity policy: P0 blocks publishing · P1 fix before posting · P2 log and ship — do NOT enter
// a re-render polish loop for P2s the judge already passed.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { COMPREHENSION_RUBRIC, COMPREHENSION_VERSION, evaluateComprehension, formatComprehension } from "./comprehension-rubric.mjs";

const argv = process.argv.slice(2);
const video = argv.find((a) => !a.startsWith("--"));
// Reference videos are passed as YouTube URLs and never downloaded. Gemini reads a YouTube URI
// directly — verified: it described the opening seconds and runtime of a real video from the URL
// alone — so a reference is CITED rather than copied. That is the Mobbin discipline arriving for
// free: observe and attribute, never re-host, and the locator is the URL plus a timestamp.
let references = argv.filter((a) => a.startsWith("--reference=")).map((a) => a.slice("--reference=".length));
// Self-directing by default: with no explicit --reference, use whatever find-references.mjs has
// already observed. A corpus nobody has to remember to pass is the difference between a bar that
// applies and a bar that exists. --no-reference opts out.
if (references.length === 0 && !argv.includes("--no-reference") && existsSync("references/video")) {
  references = readdirSync("references/video")
    .filter((f) => f.endsWith(".json"))
    .map((f) => { try { return JSON.parse(readFileSync(`references/video/${f}`, "utf8")).source?.url; } catch { return null; } })
    .filter(Boolean)
    .slice(0, 2);   // two is a comparison; more is mostly token cost
  if (references.length) console.log(`[judge] using ${references.length} reference(s) from references/video (--no-reference to skip)`);
}
if (!video || !existsSync(video)) {
  console.error("usage: node judge-video.mjs <video.mp4|webm|mov> [--reference=<youtube-url> ...]");
  process.exit(1);
}

const key = () => {
  for (const k of ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"]) if (process.env[k]) return process.env[k];
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    const m = readFileSync(f, "utf8").match(/^(?:GEMINI_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY)=(.+)$/m);
    if (m) return m[1].trim();
  }
  throw new Error("set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY");
};

const RUBRIC = `You are judging a rendered product-walkthrough video (a feature demo with an
animated cursor, click ripples, step captions, and a progress bar — possibly with narration).
The quality bar is STORY-FIRST and ANTI-HERO-SHOT. The viewer should understand the premise,
the question being tested, the comparison axis, the conflict/input, the evidence, the verdict,
and the final decision. Camera moves should reveal evidence, not fake excellence.

A viewer must always see the empty state, where the cursor
clicked, any loading state, and the result — never just a polished final state.

Score each dimension 0-2 (0=fails, 1=acceptable, 2=strong) WITH specific evidence + timestamps:
1. storyboard_clarity - can a first-time viewer state what is being compared, why it matters, and what each scene proves?
2. state_coverage - does each flow show empty state -> action -> (loading if async) -> result, or does it skip to outcomes (hero-shot smell)?
3. cursor_truth - does the cursor visibly travel to and land ON the control being used before each state change?
4. caption_sync - do step captions match what is actually happening on screen (and any narration heard)?
5. pacing - can a first-time viewer read each caption and register each state? any dead air or rushed beats?
6. legibility - is app text readable at the rendered size? are captions large and contrasty enough?
7. proof_feel - does it read as evidence of a real working product (real states, real data motion) rather than staged marketing?
8. safety - any visible secrets, API keys, tokens, real personal data, or internal URLs that should not ship?
9. loop_etiquette - if this loops as a GIF, is the total length and final-state hold reasonable (viewers lost on the second loop = too long)?
10. motion_craft - do camera moves REVEAL evidence rather than decorate? Is the zoom-to-focus landing on the region the caption is talking about, held long enough to read, and eased rather than snapped? Any jitter, drift, competing simultaneous motion, or a move that ends somewhere the viewer did not need to look?
11. visual_hierarchy - at every moment, is exactly one thing asking for attention? Is the focused region actually distinguished (framing, scale, contrast, dimming of the rest) rather than merely centred? Does anything decorative compete with the evidence?

REFERENCE STANDARD. Score against how the best product demos actually work, not against
"a video was produced":
- ONE moment carries it. Vercel's demo is push code, watch it deploy — the aha lands in seconds and
  the brevity IS the message. Ask: what is THIS video's single moment, and does it arrive early?
- SPEED IS SHOWN, NOT CLAIMED. Linear's demo leans on the product being fast: issue creation,
  filtering and navigation happen visibly instantly, with the keystrokes and snappy transitions on
  screen. Latency edited out is a hero shot; latency shown and short is proof.
- COMPOUND VALUE reads as one conversation. Stripe's tour makes many capabilities feel like a single
  system rather than a feature list. A demo that is a tour of tabs has no thesis.
If the video has no identifiable single moment, say so as a P0 under storyboard_clarity — that is
the defect that makes a technically-correct walkthrough forgettable.

WHAT YOU CANNOT SEE, and must not claim. You are watching PIXELS. Three different things can be
true or false independently — what was INTENDED, what the RUNTIME actually did, and what a viewer
can SEE — and four mismatch classes live between them:
  intent-runtime      the thing that was supposed to happen never happened
  runtime-pixel       it happened but was never visible in frame
  pixel-experience    it was visible but framed or paced so the viewer cannot read it
  experience-interaction  it reads fine but a user could not actually reach or trigger it
You can only judge the last two. Never assert that a number is correct, that a backend really ran,
or that data is real — a convincing render of a fabricated result looks identical to a true one from
here. When a claim's truth depends on something off-screen, record it in defects with severity P1
and observed starting "unverifiable-from-video:" so a human knows to check it another way.

Then list DEFECTS: each with timestamp, severity (P0 blocks publishing / P1 fix before posting /
P2 polish, log and ship), what you observed, and a concrete fix.
Finally an overall verdict: publish | fix-then-publish | rework.

Return STRICT JSON: {"scores":{"storyboard_clarity":{"score":n,"evidence":"..."},"state_coverage":{"score":n,"evidence":"..."},...},
"defects":[{"ts":"m:ss","severity":"P0|P1|P2","observed":"...","fix":"..."}],
"singleMoment":"the one moment this video is built around, or null if it has none",
"verdict":"...","summary":"2-3 sentences"}`;

// Always appended. Comprehension is not an optional lens — a video nobody outside the team can
// follow has failed whatever its craft score says, and making it opt-in would mean it is asked for
// only by someone who already suspects the answer.
const FULL_RUBRIC = `${RUBRIC}

${COMPREHENSION_RUBRIC}`;

/**
 * Added when reference videos are supplied. The candidate is video 1; references follow in order.
 *
 * The point is not "be more like them". It is to convert taste into a comparison a reader can
 * check: the reference is on screen, so a claim about it carries a timestamp and can be disputed.
 */
const COMPARE = (uris) => `REFERENCE COMPARISON. Video 1 is the CANDIDATE under judgement. Videos 2..${uris.length + 1}
are REFERENCE videos supplied as exemplars, in this order:
${uris.map((u, i) => `  video ${i + 2}: ${u}`).join("\n")}

Judge the candidate on its own terms first — the scores and defects above are about video 1 only.
Then add a "reference" block comparing them on the axes that actually transfer:
  singleMoment      what is each reference built around, and how early does it land?
  statePacing       how long does a reference hold a state before moving on, in seconds?
  motionPurpose     when a reference moves the camera, what is it revealing?
  whatToSteal       one concrete, transferable technique, with a timestamp in the reference
  whatNotToSteal    something a reference does that would be dishonest for THIS product, and why

Cite a timestamp in the reference for every claim about it. "Their pacing is good" is not an
observation; "at 0:12 the loading state holds for about 1.4s before the result" is. If a reference
cannot be watched, say so in that block rather than describing it from memory.

Add to the JSON: "reference":{"watched":["<uri>"],"unwatched":["<uri>"],"singleMoment":"...",
"statePacing":"...","motionPurpose":"...","whatToSteal":"...","whatNotToSteal":"..."}`;

/** Bumped whenever the rubric changes, so an old verdict is not read as a current one. */
const RUBRIC_VERSION = "2026-08-03.youtube-reference-comparison";

const run = async () => {
  const bytes = readFileSync(video);
  if (bytes.length > 19_000_000) throw new Error(`${(bytes.length / 1048576).toFixed(1)}MB > inline limit — use the Gemini Files API or render a smaller cut`);
  console.log(`[judge] ${video} — ${(bytes.length / 1048576).toFixed(1)}MB → gemini`);
  // gemini-3.6-flash, GA 2026-07-21. Pinned rather than floating: a judge whose model changes
  // underneath it produces verdicts that cannot be compared, and rubricVersion + judgedBy in the
  // receipt only mean something if the model is a stated choice.
  //
  // I previously reported this model did not exist, on the evidence of a ListModels response that
  // did not include it. ListModels is not an existence proof — it was stale for that key, and a
  // direct generateContent call returns 200 with valid strict JSON. Absence from an index is
  // absence from an index.
  const model = process.env.GEMINI_JUDGE_MODEL || "gemini-3.6-flash";
  const mime = video.endsWith(".webm") ? "video/webm" : video.endsWith(".mov") ? "video/quicktime" : "video/mp4";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key()}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mime, data: bytes.toString("base64") } },
          // References follow the candidate so "the first video" is unambiguous.
          ...references.map((uri) => ({ file_data: { file_uri: uri } })),
          { text: references.length ? `${FULL_RUBRIC}

${COMPARE(references)}` : FULL_RUBRIC },
        ],
      }],
      generationConfig: { temperature: 0.2, response_mime_type: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = await res.json();
  const judge = JSON.parse((body.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join(""));

  const comprehension = evaluateComprehension(judge.comprehension);
  const base = video.replace(/\.(mp4|webm|mov)$/i, "");
  // The markdown named the model; the JSON did not, so the machine-readable verdict — the one a gate
  // would consume — could not say which judge or which bar produced it. A verdict whose rubric
  // version is unknown cannot be told apart from one scored against a weaker bar.
  writeFileSync(`${base}.judge.json`, JSON.stringify({
    ...judge,
    judgedBy: model,
    rubricVersion: RUBRIC_VERSION,
    comprehensionVersion: COMPREHENSION_VERSION,
    comprehensionVerdict: comprehension,
    videoBytes: bytes.length,
    referencesCited: references,
    judgedAt: new Date().toISOString(),
  }, null, 2));
  const scores = Object.entries(judge.scores);
  const total = scores.reduce((a, [, v]) => a + v.score, 0);
  const md = [
    `# Video judge — ${video}`,
    ``,
    `**Judge:** ${model} (video understanding) · **Verdict:** ${judge.verdict} · **Score:** ${total}/${scores.length * 2}`,
    ``,
    `> ${judge.summary}`,
    ``,
    `| Dimension | Score | Evidence |`,
    `|---|---|---|`,
    ...scores.map(([k, v]) => `| ${k} | ${v.score}/2 | ${v.evidence} |`),
    ``,
    `## Defects`,
    ...(judge.defects?.length ? judge.defects.map((d) => `- **${d.severity} @ ${d.ts}** — ${d.observed} → *${d.fix}*`) : ["(none found)"]),
  ].join("\n");
  writeFileSync(`${base}.judge.md`, md + "\n");
  console.log(md);
};
run().catch((e) => { console.error(e.message || e); process.exit(1); });
