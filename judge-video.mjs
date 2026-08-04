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
import { rubricPrompt, CRAFT, COMPREHENSION, MAX } from "./rubric.mjs";

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
// The audience the COMPREHENSION half is scored from. This is not cosmetic: the
// same cut is a 2 on lay_sense for a domain expert and a 0 for someone who has
// never heard the jargon, and the whole point of the second rubric is to make
// that difference a number instead of an argument.
const audience = flag("for", process.env.JUDGE_AUDIENCE || "a smart newcomer who has never seen this product and does not know the domain jargon");
const gate = Number(flag("gate", process.env.JUDGE_GATE || "0"));   // exit 1 below this score
const samples = Number(flag("samples", process.env.JUDGE_SAMPLES || "3"));
const reask = argv.includes("--reask");
const video = argv.find((a) => !a.startsWith("--") && argv[argv.indexOf(a) - 1] !== "--for" && argv[argv.indexOf(a) - 1] !== "--gate");
if (!video || !existsSync(video)) {
  console.error("usage: node judge-video.mjs <video.mp4|webm|mov> [--for \"<audience>\"] [--gate <n>]");
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

const RUBRIC = rubricPrompt(audience);

const run = async () => {
  const bytes = readFileSync(video);
  if (bytes.length > 19_000_000) throw new Error(`${(bytes.length / 1048576).toFixed(1)}MB > inline limit — use the Gemini Files API or render a smaller cut`);
  console.log(`[judge] ${video} — ${(bytes.length / 1048576).toFixed(1)}MB → gemini`);
  const model = process.env.GEMINI_JUDGE_MODEL || "gemini-3.6-flash";
  const mime = video.endsWith(".webm") ? "video/webm" : video.endsWith(".mov") ? "video/quicktime" : "video/mp4";
  const base = video.replace(/\.(mp4|webm|mov)$/i, "");

  // One call shape, reused by the first judgement and by the anti-uniformity
  // re-ask. `extra` is appended AFTER the rubric so a follow-up can quote the
  // previous distribution back without restating the whole rubric.
  const ask = async (extra = []) => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key()}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          ...referenceParts,
          { text: referenceParts.length ? "SUBJECT VIDEO — this is the one being judged:" : "" },
          { inline_data: { mime_type: mime, data: bytes.toString("base64") } },
          { text: REFERENCES + RUBRIC },
          ...extra,
        ].filter((p) => p.text !== "") }],
        generationConfig: { temperature: 0.2, response_mime_type: "application/json" },
      }),
    });
    if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const body = await res.json();
    const raw = (body.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
    let out = null;
    try { out = JSON.parse(raw); } catch {}
    if (!out || !out.scores) {
      writeFileSync(`${base}.judge.raw.txt`, raw || JSON.stringify(body, null, 2));
      throw new Error(`judge returned no usable scores (finishReason=${body.candidates?.[0]?.finishReason}); raw saved to ${base}.judge.raw.txt`);
    }
    return out;
  };

  let judge = await ask();

  writeFileSync(`${base}.judge.json`, JSON.stringify(judge, null, 2));
  // MEASURED: THIS GATE IS NOT REPEATABLE ON ONE SAMPLE.
  //
  // The identical file scored 34/44 and then 22/44 on two runs. That is not a
  // small wobble, it is 27% of the scale, and every claim of the form "the cut
  // improved" made from single readings of it was unsupported -- including one
  // this repo shipped ("comprehension 9 -> 16, the voiceover was the missing
  // piece"), which was judge variance wearing the costume of a result.
  //
  // Two causes, separated by correlating the runs:
  //
  // 1. Ordinary sampling variance at temperature 0.2.
  // 2. THE ANTI-UNIFORMITY RE-ASK ITSELF. Both 22s re-asked; the 34 did not.
  //    Told "you gave 91% of dimensions the same score, force a spread", the
  //    model spreads DOWNWARD -- it drops dimensions to 0 and 1 rather than
  //    also promoting any to 2. So the mechanism added to stop the judge
  //    shrugging was quietly biasing the number it produced. It is now opt-in
  //    behind --reask, and off by default, because a debiasing device that
  //    biases is worse than the shrug it was fixing.
  //
  // The fix for (1) is sampling: N independent judgements, per-dimension MEDIAN.
  // Evidence and prose are taken from the run closest to the median total, so the
  // report still reads as one coherent judgement rather than a stitched average.
  const runs = [judge];
  for (let n = 1; n < samples; n++) runs.push(await ask());
  if (reask) {
    const spread = (j2) => {
      const v = Object.values(j2.scores || {}).map((x) => x.score);
      return Math.max(...[0, 1, 2].map((q) => v.filter((x) => x === q).length)) / v.length;
    };
    if (spread(judge) > 0.7) {
      console.log(`[judge] --reask: ${Math.round(spread(judge) * 100)}% share one score — re-asking (known to bias low)`);
      runs.push(await ask([{ text: `Your previous judgement gave the SAME score to most dimensions. Re-judge and FORCE a spread: some dimensions are genuinely 0 and some are genuinely 2. Do NOT simply lower scores -- promote what deserves 2 as readily as you demote. Keep the same JSON shape.` }]));
    }
  }

  const med = (xs) => { const a = [...xs].sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
  const totalOf = (j2) => Object.values(j2.scores).reduce((a, v) => a + v.score, 0);
  if (runs.length > 1) {
    const keys = new Set(runs.flatMap((r) => Object.keys(r.scores)));
    const totals = runs.map(totalOf);
    // Prose comes from the most typical run, so evidence matches the numbers.
    const centre = runs[totals.indexOf(med(totals))] || runs[0];
    const merged = {};
    keys.forEach((k) => {
      const vals = runs.map((r) => r.scores[k]?.score).filter((v) => v != null);
      merged[k] = { score: med(vals), evidence: (centre.scores[k] || runs[0].scores[k] || {}).evidence || "" };
    });
    console.log(`[judge] ${runs.length} samples: totals ${totals.join(", ")} — median per dimension`);
    judge = { ...centre, scores: merged, samples: runs.length, sample_totals: totals };
  }

  const scores = Object.entries(judge.scores);
  const total = scores.reduce((a, [, v]) => a + v.score, 0);
  const sub = (list) => list.reduce((a, [k]) => a + (judge.scores[k]?.score ?? 0), 0);
  const craft = sub(CRAFT), comp = sub(COMPREHENSION);
  const row = ([k]) => `| ${k} | ${judge.scores[k]?.score ?? "-"}/2 | ${(judge.scores[k]?.evidence || "").replace(/\|/g, "\|")} |`;

  const md = [
    `# Video judge — ${video}`,
    ``,
    `**Judge:** ${model} · **Audience:** ${audience}`,
    `**Verdict:** ${judge.verdict} · **Score:** ${total}/${MAX} — craft ${craft}/${CRAFT.length * 2}, comprehension ${comp}/${COMPREHENSION.length * 2}`,
    ``,
    `> ${judge.summary}`,
    ``,
    // The split is printed even when it is flattering, because the gap between
    // the two halves IS the finding. A cut that is 16/20 craft and 7/20
    // comprehension is not "a 23" -- it is a well-made video nobody understood.
    `## Craft — is it well made (${craft}/${CRAFT.length * 2})`,
    ``, `| Dimension | Score | Evidence |`, `|---|---|---|`, ...CRAFT.map(row),
    ``,
    `## Comprehension — did anyone understand it (${comp}/${COMPREHENSION.length * 2})`,
    `Judged as: *${audience}*`,
    ``, `| Dimension | Score | Evidence |`, `|---|---|---|`, ...COMPREHENSION.map(row),
    ``,
    `Weakest overall: **${judge.weakest}** · strongest: **${judge.strongest}** · weakest comprehension: **${judge.weakest_comprehension || "-"}**`,
    ``,
    `## Defects`,
    ...(judge.defects?.length ? judge.defects.map((d) => `- **${d.severity} @ ${d.ts}** — ${d.observed} → *${d.fix}*`) : ["(none found)"]),
    ``,
    `## Next cut — the revision brief`,
    ...(judge.next_cut?.length
      ? judge.next_cut.map((n) => `- **${n.dimension}** @ ${n.where} — ${n.change}`)
      : ["(judge returned no next_cut — treat that as a judge defect, not a passing grade)"]),
  ].join("\n");
  writeFileSync(`${base}.judge.md`, md + "\n");
  console.log(md);

  if (gate && total < gate) {
    console.error(`\n[gate] ${total}/${MAX} < ${gate} — not shippable. Apply the next-cut brief above and re-run.`);
    process.exit(1);
  }
};
run().catch((e) => { console.error(e.message || e); process.exit(1); });
