import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, sep } from "node:path";
import { execFile, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  EvidenceError,
  buildEvidenceReceipt,
  buildNodeKitEvidenceIndex,
  verifyEvidenceManifest,
} from "../scripts/featureclip-evidence.mjs";

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function png(width = 2, height = 3) {
  const bytes = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes, 0);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

function runGit(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed`);
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function makeRepo(t) {
  const root = mkdtempSync(join(tmpdir(), "featureclip-evidence-"));
  t.after(() => removeOwnedFixture(root, "featureclip-evidence-"));
  const bytes = png();
  mkdirSync(join(root, "assets"), { recursive: true });
  mkdirSync(join(root, "evidence"), { recursive: true });
  writeFileSync(join(root, "assets", "frame.png"), bytes);
  writeFileSync(join(root, "README.md"), "# fixture\n");
  const manifest = {
    schemaVersion: "featureclip.evidence-manifest/v1",
    repository: "HomenShum/FeatureClipStudio",
    collectionId: "fixture",
    nodekitChangeId: "change-fixture",
    requireGitTracked: true,
    artifacts: [
      {
        id: "frame",
        title: "Fixture frame",
        artifactKind: "screenshot",
        path: "assets/frame.png",
        mediaType: "image/png",
        sha256: sha256(bytes),
        bytes: bytes.length,
        dimensions: { width: 2, height: 3 },
        sourceTruth: {
          representation: "captured-product-ui",
          captureEnvironment: "local-fixture",
          artifactVerification: "repository-bytes",
          workflowVerification: "unverified",
          verificationReceipt: null,
        },
        basis: [{
          path: "README.md",
          digestMode: "normalized-text-sha256",
          sha256: sha256(Buffer.from("# fixture\n")),
        }],
        limitations: ["Fixture-only evidence."],
      },
    ],
  };
  writeJson(join(root, "evidence", "nodekit-present.manifest.json"), manifest);
  runGit(root, ["init", "--quiet"]);
  runGit(root, ["add", "README.md", "assets/frame.png", "evidence/nodekit-present.manifest.json"]);
  return { root, manifest, bytes };
}

function removeOwnedFixture(root, prefix) {
  const delta = relative(realpathSync(tmpdir()), realpathSync(root));
  assert.ok(delta && delta !== ".." && !delta.startsWith(`..${sep}`) && !isAbsolute(delta));
  assert.ok(basename(root).startsWith(prefix));
  rmSync(root, { recursive: true, force: true });
}

function persistManifest(root, manifest) {
  writeJson(join(root, "evidence", "nodekit-present.manifest.json"), manifest);
}

test("verifies tracked bytes and projects an honest observed evidence record", (t) => {
  const { root } = makeRepo(t);
  const verified = verifyEvidenceManifest(root);
  const projected = buildNodeKitEvidenceIndex(verified);
  const receipt = buildEvidenceReceipt(verified, projected);

  assert.equal(verified.artifacts.length, 1);
  assert.equal(projected.schemaVersion, "nodekit.evidence-index/v1");
  assert.equal(projected.evidence[0].status, "observed");
  assert.match(projected.evidence[0].summary, /no workflow receipt reference/);
  assert.equal(receipt.checks.passed, true);
  assert.equal(receipt.checks.workflowReceiptReferences, 0);
  assert.equal(Object.hasOwn(receipt.checks, "independentWorkflowReceipts"), false);
  assert.equal(receipt.claimBoundary.releaseReady, false);
  assert.equal(receipt.claimBoundary.productWorkflowProof, "not-certified");
});

test("fails closed when a declared artifact is missing", (t) => {
  const { root, manifest } = makeRepo(t);
  manifest.artifacts[0].path = "assets/missing.png";
  persistManifest(root, manifest);
  assert.throws(() => verifyEvidenceManifest(root), /does not exist/);
});

test("fails closed when an artifact exists but is not Git-tracked", (t) => {
  const { root, manifest } = makeRepo(t);
  const bytes = png(5, 6);
  writeFileSync(join(root, "assets", "untracked.png"), bytes);
  Object.assign(manifest.artifacts[0], {
    path: "assets/untracked.png",
    sha256: sha256(bytes),
    bytes: bytes.length,
    dimensions: { width: 5, height: 6 },
  });
  persistManifest(root, manifest);
  assert.throws(() => verifyEvidenceManifest(root), /is not tracked by Git/);
});

test("fails closed on repository path traversal", (t) => {
  const { root, manifest } = makeRepo(t);
  manifest.artifacts[0].path = "../outside.png";
  persistManifest(root, manifest);
  assert.throws(() => verifyEvidenceManifest(root), /unsafe path segment/);
});

test("fails closed on digest drift", (t) => {
  const { root } = makeRepo(t);
  writeFileSync(join(root, "assets", "frame.png"), png(4, 4));
  assert.throws(() => verifyEvidenceManifest(root), /digest drift/);
});

test("fails closed on declared metadata drift", (t) => {
  const { root, manifest } = makeRepo(t);
  manifest.artifacts[0].dimensions.width = 99;
  persistManifest(root, manifest);
  assert.throws(() => verifyEvidenceManifest(root), /dimension drift/);
});

test("fails closed on provenance-basis drift", (t) => {
  const { root } = makeRepo(t);
  writeFileSync(join(root, "README.md"), "# changed fixture\n");
  assert.throws(() => verifyEvidenceManifest(root), /basis\[0\] digest drift/);
});

test("rejects uppercase ids at the grammar boundary and valid duplicate ids", (t) => {
  const { root, manifest } = makeRepo(t);
  manifest.artifacts.push({ ...structuredClone(manifest.artifacts[0]), id: "FRAME" });
  persistManifest(root, manifest);
  assert.throws(() => verifyEvidenceManifest(root), /must be kebab-case/);
  manifest.artifacts[1].id = "frame";
  persistManifest(root, manifest);
  assert.throws(() => verifyEvidenceManifest(root), /duplicate artifact id/);
});

test("fails closed on duplicate artifact paths", (t) => {
  const { root, manifest } = makeRepo(t);
  manifest.artifacts.push({ ...structuredClone(manifest.artifacts[0]), id: "other-frame" });
  persistManifest(root, manifest);
  assert.throws(() => verifyEvidenceManifest(root), /duplicate artifact path/);
});

test("fails closed when generated media is labeled like a real capture", (t) => {
  const { root, manifest } = makeRepo(t);
  manifest.artifacts[0].sourceTruth.representation = "generated-illustration";
  manifest.artifacts[0].sourceTruth.captureEnvironment = "deployed-application";
  persistManifest(root, manifest);
  assert.throws(() => verifyEvidenceManifest(root), /generated illustrations must use captureEnvironment=unknown/);
});

test("fails closed when an unverified artifact attaches a receipt", (t) => {
  const { root, manifest } = makeRepo(t);
  manifest.artifacts[0].sourceTruth.verificationReceipt = {
    path: "proof/fake.json",
    sha256: "0".repeat(64),
    schemaVersion: "fake/v1",
  };
  persistManifest(root, manifest);
  assert.throws(() => verifyEvidenceManifest(root), /cannot attach a verification receipt/);
});

test("a deck author receives observed status for schema-only, failed and unbound receipt references", (t) => {
  const { root, manifest } = makeRepo(t);
  mkdirSync(join(root, "proof"), { recursive: true });
  for (const body of [
    { schemaVersion: "browser.receipt/v1" },
    { schemaVersion: "browser.receipt/v1", passed: false },
    { schemaVersion: "browser.receipt/v1", passed: true, artifactSha256: "f".repeat(64) },
  ]) {
    const receipt = Buffer.from(`${JSON.stringify(body)}\n`);
    writeFileSync(join(root, "proof", "browser.json"), receipt);
    runGit(root, ["add", "proof/browser.json"]);
    manifest.artifacts[0].sourceTruth.workflowVerification = "browser-receipt";
    manifest.artifacts[0].sourceTruth.verificationReceipt = {
      path: "proof/browser.json", sha256: sha256(receipt), schemaVersion: "browser.receipt/v1",
    };
    persistManifest(root, manifest);
    const verified = verifyEvidenceManifest(root);
    const projection = buildNodeKitEvidenceIndex(verified);
    const result = buildEvidenceReceipt(verified, projection);
    assert.equal(projection.evidence[0].status, "observed");
    assert.match(projection.evidence[0].summary, /reference contents do not certify a workflow outcome/);
    assert.equal(result.checks.workflowReceiptReferences, 1);
    assert.equal(result.claimBoundary.productWorkflowProof, "not-certified");
    assert.equal(result.claimBoundary.releaseReady, false);
    t.diagnostic(JSON.stringify({ receiptBody: body, actualStatus: projection.evidence[0].status, references: 1, productWorkflowProof: result.claimBoundary.productWorkflowProof }));
  }
});

test("fails closed on a symlink escape when the platform permits creating one", (t) => {
  const { root, manifest } = makeRepo(t);
  const outside = mkdtempSync(join(tmpdir(), "featureclip-outside-"));
  t.after(() => removeOwnedFixture(outside, "featureclip-outside-"));
  writeFileSync(join(outside, "frame.png"), png());
  try {
    symlinkSync(join(outside, "frame.png"), join(root, "assets", "linked.png"), "file");
  } catch (error) {
    if (error.code === "EPERM" || error.code === "EACCES") {
      t.skip("filesystem does not permit symlink creation");
      return;
    }
    throw error;
  }
  runGit(root, ["add", "assets/linked.png"]);
  manifest.artifacts[0].path = "assets/linked.png";
  persistManifest(root, manifest);
  assert.throws(() => verifyEvidenceManifest(root), EvidenceError);
  assert.throws(() => verifyEvidenceManifest(root), /outside the repository root|must not be a symbolic link/);
});

const adapterPath = fileURLToPath(new URL("../scripts/featureclip-evidence.mjs", import.meta.url));
const proofPaths = ["proof/nodekit-present.evidence-index.json", "proof/featureclip-evidence.receipt.json"];

function runCli(root, args) {
  return spawnSync(process.execPath, [adapterPath, ...args], {
    cwd: root, encoding: "utf8", windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024,
  });
}

function outputBytes(root) {
  return proofPaths.map((path) => readFileSync(join(root, path)));
}

test("a publisher explicitly projects files and stale proof never rewrites them", (t) => {
  const { root } = makeRepo(t);
  const implicit = runCli(root, ["project"]);
  assert.equal(implicit.status, 1);
  assert.match(implicit.stderr, /project requires --write/);
  const missing = runCli(root, ["proof"]);
  assert.equal(missing.status, 1);
  assert.equal(runCli(root, ["project", "--write"]).status, 0);
  const original = outputBytes(root);
  assert.equal(runCli(root, ["proof"]).status, 0);
  assert.deepEqual(outputBytes(root), original);

  const projection = JSON.parse(original[0]);
  projection.evidence[0].status = "verified";
  writeJson(join(root, proofPaths[0]), projection);
  const staleProjection = outputBytes(root);
  const rejectedProjection = runCli(root, ["proof"]);
  assert.equal(rejectedProjection.status, 1);
  assert.match(rejectedProjection.stderr, /projection is stale/);
  assert.deepEqual(outputBytes(root), staleProjection);
  writeFileSync(join(root, proofPaths[0]), original[0]);

  const receipt = JSON.parse(original[1]);
  receipt.checks.workflowReceiptReferences = 99;
  writeJson(join(root, proofPaths[1]), receipt);
  const staleReceipt = outputBytes(root);
  const rejectedReceipt = runCli(root, ["proof"]);
  assert.equal(rejectedReceipt.status, 1);
  assert.match(rejectedReceipt.stderr, /receipt is stale/);
  assert.deepEqual(outputBytes(root), staleReceipt);
  t.diagnostic(JSON.stringify({ implicitProject: implicit.status, missingProof: missing.status,
    staleProjection: rejectedProjection.status, staleReceipt: rejectedReceipt.status, proofRewrites: false }));
});

test("a publisher's shape, size, extension and signature mistakes are rejected", (t) => {
  for (const kind of ["shape", "size", "extension", "signature"]) {
    const { root, manifest } = makeRepo(t);
    if (kind === "shape") manifest.extra = true;
    if (kind === "size") manifest.artifacts[0].bytes += 1;
    if (kind === "extension") manifest.artifacts[0].mediaType = "image/gif";
    if (kind === "signature") {
      const badBytes = Buffer.alloc(24);
      writeFileSync(join(root, "assets/frame.png"), badBytes);
      manifest.artifacts[0].sha256 = sha256(badBytes);
    }
    persistManifest(root, manifest);
    const message = { shape: /fields are invalid/, size: /byte-size drift/,
      extension: /mediaType does not match/, signature: /not a valid PNG signature/ }[kind];
    assert.throws(() => verifyEvidenceManifest(root), message);
    const result = runCli(root, ["check"]);
    assert.equal(result.status, 1);
    t.diagnostic(JSON.stringify({ negative: kind, exitCode: result.status, error: result.stderr.trim() }));
  }
});

test("a publisher cannot use missing, untracked, drifted or malformed receipt references", (t) => {
  for (const kind of ["missing", "untracked", "digest", "schema", "json"]) {
    const { root, manifest } = makeRepo(t);
    const body = Buffer.from(kind === "json" ? "not JSON\n" : '{"schemaVersion":"browser.receipt/v1"}\n');
    mkdirSync(join(root, "proof"));
    if (kind !== "missing") writeFileSync(join(root, "proof/browser.json"), body);
    if (kind !== "missing" && kind !== "untracked") runGit(root, ["add", "proof/browser.json"]);
    manifest.artifacts[0].sourceTruth.workflowVerification = "browser-receipt";
    manifest.artifacts[0].sourceTruth.verificationReceipt = {
      path: "proof/browser.json", sha256: kind === "digest" ? "0".repeat(64) : sha256(body),
      schemaVersion: kind === "schema" ? "other/v1" : "browser.receipt/v1",
    };
    persistManifest(root, manifest);
    const result = runCli(root, ["check"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, { missing: /does not exist/, untracked: /not tracked/,
      digest: /receipt digest drift/, schema: /receipt schema drift/, json: /receipt is not valid JSON/ }[kind]);
    t.diagnostic(JSON.stringify({ negative: `receipt-${kind}`, exitCode: result.status, error: result.stderr.trim() }));
  }
});

test("a redirected proof directory is rejected for writing and reading with foreign files unchanged", (t) => {
  const { root } = makeRepo(t);
  const outside = mkdtempSync(join(tmpdir(), "featureclip-outside-"));
  t.after(() => removeOwnedFixture(outside, "featureclip-outside-"));
  for (const path of proofPaths) writeFileSync(join(outside, basename(path)), '{"foreign":true}\n');
  const original = proofPaths.map((path) => readFileSync(join(outside, basename(path))));
  try {
    symlinkSync(outside, join(root, "proof"), process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (error.code === "EPERM" || error.code === "EACCES") return t.skip("filesystem does not permit directory links");
    throw error;
  }
  for (const args of [["project", "--write"], ["proof"]]) {
    const result = runCli(root, args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /proof output parent must be an owned nonredirected directory/);
    assert.deepEqual(proofPaths.map((path) => readFileSync(join(outside, basename(path)))), original);
    assert.deepEqual(readdirSync(outside).sort(), proofPaths.map((path) => basename(path)).sort());
    t.diagnostic(JSON.stringify({ redirectedCommand: args[0], exitCode: result.status, foreignFilesChanged: false }));
  }
});

test("an existing proof-file link cannot be overwritten or read as owned output", (t) => {
  const { root } = makeRepo(t);
  const outside = mkdtempSync(join(tmpdir(), "featureclip-outside-"));
  t.after(() => removeOwnedFixture(outside, "featureclip-outside-"));
  const sentinel = join(outside, "foreign.json");
  const original = Buffer.from('{"foreign":true}\n');
  writeFileSync(sentinel, original);
  mkdirSync(join(root, "proof"));
  try {
    symlinkSync(sentinel, join(root, proofPaths[0]), "file");
  } catch (error) {
    if (error.code === "EPERM" || error.code === "EACCES") return t.skip("filesystem does not permit file links");
    throw error;
  }
  for (const args of [["project", "--write"], ["proof"]]) {
    const result = runCli(root, args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /outside the repository root|must not be a symbolic link/);
    assert.deepEqual(readFileSync(sentinel), original);
    assert.deepEqual(readdirSync(join(root, "proof")), [basename(proofPaths[0])]);
    t.diagnostic(JSON.stringify({ linkedOutputCommand: args[0], exitCode: result.status, foreignFileChanged: false }));
  }
});

test("eight repeated handoffs remain deterministic across JSON key order and text newlines", (t) => {
  const { root, manifest } = makeRepo(t);
  assert.equal(runCli(root, ["project", "--write"]).status, 0);
  const original = outputBytes(root);
  for (let round = 0; round < 8; round += 1) {
    writeFileSync(join(root, "README.md"), round % 2 ? "# fixture\r\n" : "# fixture\n");
    const ordered = Object.fromEntries(Object.entries(manifest).reverse());
    ordered.artifacts = manifest.artifacts.map((artifact) => Object.fromEntries(Object.entries(artifact).reverse()));
    persistManifest(root, ordered);
    assert.equal(runCli(root, ["project", "--write"]).status, 0);
    assert.deepEqual(outputBytes(root), original);
    assert.equal(runCli(root, ["proof"]).status, 0);
    assert.deepEqual(outputBytes(root), original);
    assert.deepEqual(readdirSync(join(root, "proof")).sort(), proofPaths.map((path) => basename(path)).sort());
  }
  t.diagnostic(JSON.stringify({ repeatedRounds: 8, deterministicBytes: true, accumulatedTemporaryFiles: 0 }));
});

test("two publishers can project concurrently in disjoint owned fixture repositories", async (t) => {
  const repos = [makeRepo(t), makeRepo(t)];
  const results = await Promise.all(repos.map(({ root }) => new Promise((resolve) => {
    execFile(process.execPath, [adapterPath, "project", "--write"], {
      cwd: root, encoding: "utf8", windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024,
    }, (error, stdout, stderr) => resolve({ error, stdout, stderr }));
  })));
  for (const result of results) {
    assert.equal(result.error, null, result.stderr);
    assert.equal(JSON.parse(result.stdout).evidence, 1);
  }
  assert.deepEqual(outputBytes(repos[0].root), outputBytes(repos[1].root));
  for (const { root } of repos) assert.equal(runCli(root, ["proof"]).status, 0);
  t.diagnostic(JSON.stringify({ simultaneousJobs: 2, disjointRepositories: true, sameOutputConcurrencyCertified: false }));
});
