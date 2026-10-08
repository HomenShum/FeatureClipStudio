# NodeKit Present evidence bridge

A developer preparing a deck can reuse a tracked screenshot or clip without
mistaking it for proof that the pictured workflow passed. This local bridge checks
the selected repository files and produces a content-addressed evidence index.
Matching receipt references remain references; every projected asset is observed.

## Commands and checked inputs

Run from the repository root with Node 20 or newer. These commands require no
dependency installation, browser, network or provider key:

```sh
npm run evidence:check
npm run evidence:project
npm run proof
npm run check
```

The authored input is `evidence/nodekit-present.manifest.json`. The verifier checks
its exact field shape, Git tracking, contained regular-file paths, unique IDs and
paths, declared GIF/PNG signatures, header dimensions, byte sizes and SHA-256
digests. It compares declared size before reading media bytes. Retained supporting
text hashes normalize newline differences. JSON contract hashes sort object keys.

Capture environment and representation are **declared metadata**. Matching bytes
do not independently validate those declarations, decode every image, establish
visual quality or prove capture-time/current application behavior. Synthetic test
PNG headers exercise the metadata protocol, not rendered pixels.

`evidence:project` explicitly writes two deterministic files:

- `proof/nodekit-present.evidence-index.json`, a `nodekit.evidence-index/v1` index;
- `proof/featureclip-evidence.receipt.json`, the checked inputs and claim boundary.

`proof` recomputes and compares both on-disk outputs without writing. Missing,
invalid or stale outputs fail with a nonzero exit. These outputs can be reviewed
before committing; their presence alone does not prove the verifier's code or CI.

The fixed output parent and existing output files reuse containment checks and
reject directory/file redirects before output read/write. Per-file atomic writes
do not make the two-file pair transactional. This is a trusted local single-writer
tool; it is not a filesystem sandbox and does not guarantee safety against a
concurrent adversary changing paths or against writers sharing an output pair.
Input-sized collections and local synchronous reads have no global hard caps.

## Status and receipt fields

All matching media project as `observed`. The manifest's
`sourceTruth.workflowVerification` names a declared reference kind;
`verificationReceipt` is its optional path/digest/schema-name pointer. The bridge
checks that pointer's tracked bytes and schema name, **not** its outcome, target
binding, freshness or judge quality. Schema-only, failed and unrelated references
therefore remain observed.

The receipt's former `checks.independentWorkflowReceipts` field is corrected to
`checks.workflowReceiptReferences`, with no alias. It counts resolved tracked
digest/schema-matched references, not passed workflows. The schema and output
always require `productWorkflowProof: "not-certified"` and `releaseReady: false`.
Generated illustrations retain their explicit unknown-capture boundary.

The selected initial three historical assets have zero receipt references.
Other repository examples have their own historical judge files; this bridge
does not certify them or assert that the whole repository has no receipts.

## Historical supporting files

The three original media bytes are retained. Active basis guards use only the
unchanged walkthrough scripts and Room OS state file. Original README/NODE-LOOPS
digests from PR #4 head `36dd7741e53a6cc66e4ea0eac48d8717fa60ee69` remain in
limitations and the preserved original manifest. They are not replaced by current
document digests. Supporting-file matches do not establish that an old capture
was made from today's app.

Consumers must retain the observed status, content-addressed location and summary
boundary. A presentation clip must not be relabelled as fresh browser proof,
passing workflow evidence or release certification.

## Update log and before/new proof

Named proof: `CURRENT-GATES-RETAINED-EVIDENCE-OBSERVED-DRIFT-REJECTED-01`.

The current source/citation/render-byte gate remains `node check.mjs`.
`npm run check` appends local evidence scenarios and read-only projection proof.
The existing Remotion wrapper, lock, dependency versions, CI render command,
captured media and source anchors are retained. NodeKit's finite proof command
now uses this local bridge; its preview/partial/migration-planned disclosures stay.

On 2026-10-08, unchanged main `b06ab1890b0a44634151e170a626d804c8098e9a` passed
43 JavaScript parses, 36 tour assertions, 34 prose citations and three render
records locally. The preserved PR module passed its 13 original scenarios while
actually reporting a schema-only browser receipt as verified. Only fixture
cleanup guards and an output diagnostic changed in that baseline harness; its
module and assertions remained unchanged.

The candidate's explicit projection and expanded check both exited zero:

| Evidence | Before | Candidate |
|---|---|---|
| Current source gate | 43 parses / 36 tours / 34 citations / 3 render records | 45 parses / same 36 / 34 / 3; two protocol files added |
| Local evidence scenarios | Original PR module: 13/13 passed, accepting the false promotion | 20/20 passed, no skips; 13 retained intents corrected plus seven scenarios |
| Schema-only receipt | Actual status verified | Actual status observed; failed and unbound references also observed |
| Output redirection | Source defect; before exploit not executed | Directory and file redirects rejected for project/proof; foreign files unchanged |
| Stale projection/receipt | No before CLI scenario | Exit 1 without rewriting either output |
| Repeated/disjoint handoffs | Not run before | Eight deterministic rounds; two simultaneous disjoint jobs passed |
| Selected media | Historical manifest declarations | Three actual byte/header metadata matches, three observed entries, zero receipt references |

The counts describe different scenario suites, not a matched performance score.
The first candidate npm launch failed before adapter work because the process-only
Windows ComSpec path used forward slashes. Its failure was preserved; the same
npm launcher succeeded with the native backslash path. No product source changed
to bypass that failure. Generated receipts remain not-certified/releaseReady false.
No new render, provider, production, physical-device or visual-quality result is
claimed. The existing normal CI render baseline is a separate historical result.
