// Self-judge — Gemini video understanding watches the RENDERED walkthrough and scores it against
// the anti-hero-shot quality bar, with timestamped defects. The final cut stops being the one
// stage only human eyes ever check.
//
//   node judge-video.mjs out/example.mp4            (writes out/example.judge.md + .judge.json)
//   GEMINI_JUDGE_MODEL=gemini-3.6-flash node judge-video.mjs renders/feature.mp4
//
// Judge the MP4 (the pre-palette render), not the GIF — GIF is not a supported video MIME for
// Gemini; the MP4 has identical content plus the audio track if you added narration.
// Key: GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY (env, or a local .env/.env.local line).
// Severity policy: P0 blocks publishing · P1 fix before posting · P2 log and ship — do NOT enter
// a re-render polish loop for P2s the judge already passed.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const video = process.argv[2];
if (!video || !existsSync(video)) { console.error("usage: node judge-video.mjs <video.mp4|webm|mov>"); process.exit(1); }

const key = () => {
  for (const k of ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"]) if (process.env[k]) return process.env[k];
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    const m = readFileSync(f, "utf8").match(/^(?:GEMINI_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY)=(.+)$/m);
    if (m) return m[1].trim();
  }
  throw new Error("set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY");
};


// Reference videos, watched DIRECTLY from YouTube.
//
// Gemini accepts a YouTube watch URL as a file_data part and reads the actual
// video -- verified, not assumed: usageMetadata reports modality VIDEO and ~102k
// prompt tokens for a 20-minute clip. Nothing is downloaded, hosted, or
// re-encoded, so there is no licence problem and no storage: you point at a URL.
//
// This is why the prose anchors below are the WEAK form and these are the strong
// one. "Linear ships 45-90s reels" is a claim the judge has to take on faith;
// a reference video is something it can watch and compare against, and every
// observation it makes then carries a timestamp into a real artifact.
//
// Set REFERENCE_VIDEOS to a comma-separated list of YouTube URLs to enable the
// comparison. Left empty by default: each reference costs ~100k prompt tokens,
// which is a real bill, and the calibration prose alone already moved the judge
// off uniform scoring.
const REFERENCE_VIDEOS = (process.env.REFERENCE_VIDEOS || "")
  .split(",").map((u) => u.trim()).filter(Boolean);

const referenceParts = REFERENCE_VIDEOS.flatMap((url, i) => [
  { text: `REFERENCE ${i + 1} (a demo held up as best-in-class). Watch it, then judge the SUBJECT video against it. Cite timestamps in BOTH when you compare.` },
  { file_data: { file_uri: url } },
]);

// Calibration anchors. Without these the judge scores against its own taste, which
// drifts run to run and cannot be argued with. These are what the current
// best-in-class actually does, so a 2 means "as good as these", not "nice".
const REFERENCES = `
CALIBRATE AGAINST THESE. They are the working bar, not aspirations.

  LINEAR        45-90s per reel. ONE job-to-be-done per video. Dark, dense, almost
                no narration. The changelog reads like a director's cut: a 30s
                walkthrough, then the technical detail. Nothing is explained twice.
  STRIPE        Under 90s. The API is the HERO -- code and payment flows are the
                motion, not decoration around a talking head. Technical viewers see
                the primitive; business viewers see the outcome. Same frames.
  VERCEL        The homepage demo is push-code -> watch-it-deploy. Brevity IS the
                message: it reproduces the aha moment rather than describing it.
  ARCADE        Cinematic polish as a floor, not a differentiator: smooth easing,
                deliberate zoom, no jump cuts between unrelated states.

THE GOVERNING RULE, from the same body of work:
  Identify the product's single most impressive moment and build the ENTIRE demo
  around it. If a first-time viewer's jaw drops inside 30 seconds, it works.

So when you score, ask specifically:
  - WHICH single moment is this demo built around? Name it and its timestamp. If you
    cannot find one, storyboard_clarity is 0 regardless of how polished the rest is.
  - Does that moment land inside the first 30s? If it is buried at the end behind
    setup, say so as a P1 with the timestamp it should move to.
  - Is every second before it EARNING that moment, or is it product tour filler?
  - Would LINEAR ship this length? If it is over 90s, justify every extra second or
    call it a defect.
  - Is the motion revealing evidence (Stripe: the API is the hero) or decorating a
    static screenshot?
`;

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
9. signature_moment - is there ONE moment the whole demo is built around, does it land early, and is everything before it earning it? (this is the dimension Linear/Stripe/Vercel all optimise; a demo that is uniformly pleasant and has no peak scores 0)
10. loop_etiquette - if this loops as a GIF, is the total length and final-state hold reasonable (viewers lost on the second loop = too long)?

ANTI-UNIFORMITY, and this is enforced. Two materially different cuts of the same
demo (31.9s/11 steps and 47.4s/16 steps) both scored exactly 1/2 on all ten
dimensions. That is not a judgement, it is a shrug, and a gate that returns the
same verdict regardless of input is not a gate. So:

  - You MUST NOT give every dimension the same score. If your first pass is
    uniform, you have described the video instead of judging it -- go back and
    force a ranking.
  - Name the SINGLE WEAKEST dimension and the SINGLE STRONGEST, explicitly, in
    fields "weakest" and "strongest". They must differ.
  - A 2 means "as good as the Linear/Stripe/Vercel reference for that dimension".
    A 1 means "works, but a reference cut would not ship it like this". A 0 means
    the dimension is absent or actively misleading. Most dimensions in most demos
    are NOT 2s -- if you are giving mostly 2s, re-read the references.
  - Evidence must be CRITICAL, not descriptive. "Cursor lands on UI controls" is
    a description and scores nothing. "Cursor arrives 4 frames before the click
    with no deceleration, so the landing reads as a teleport" is evidence.

Then list DEFECTS: each with timestamp, severity (P0 blocks publishing / P1 fix before posting /
P2 polish, log and ship), what you observed, and a concrete fix.
Finally an overall verdict: publish | fix-then-publish | rework.

Return STRICT JSON: {"scores":{"storyboard_clarity":{"score":n,"evidence":"..."},"state_coverage":{"score":n,"evidence":"..."},...},
"signature_moment_ts":"m:ss","weakest":"<dimension>","strongest":"<dimension>","defects":[{"ts":"m:ss","severity":"P0|P1|P2","observed":"...","fix":"..."}],
"verdict":"...","summary":"2-3 sentences"}`;

const run = async () => {
  const bytes = readFileSync(video);
  if (bytes.length > 19_000_000) throw new Error(`${(bytes.length / 1048576).toFixed(1)}MB > inline limit — use the Gemini Files API or render a smaller cut`);
  console.log(`[judge] ${video} — ${(bytes.length / 1048576).toFixed(1)}MB → gemini`);
  const model = process.env.GEMINI_JUDGE_MODEL || "gemini-3.6-flash";
  const mime = video.endsWith(".webm") ? "video/webm" : video.endsWith(".mov") ? "video/quicktime" : "video/mp4";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key()}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [
        ...referenceParts,
        { text: referenceParts.length ? "SUBJECT VIDEO — this is the one being judged:" : "" },
        { inline_data: { mime_type: mime, data: bytes.toString("base64") } },
        { text: REFERENCES + RUBRIC },
      ].filter((p) => p.text !== "") }],
      generationConfig: { temperature: 0.2, response_mime_type: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = await res.json();
  const judge = JSON.parse((body.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join(""));

  const base = video.replace(/\.(mp4|webm|mov)$/i, "");
  writeFileSync(`${base}.judge.json`, JSON.stringify(judge, null, 2));
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
