import { test } from "node:test";
import assert from "node:assert/strict";
import { decodePrune, decodeProfiles, decodePs, decodeStatus, decodeTree, webUrl } from "../mods/wtm/decode.js";

test("decodeStatus reads isolation, problems and missing env files", () => {
  const stdout = JSON.stringify({ branch: "feat", isolation: "isolated", problems: [{ code: "env-missing", message: ".env.local is missing", fix: "wtm env feat" }, { code: "x", message: "no fix" }], env: { declared: 2, missing: [".env.local"] } });
  assert.deepEqual(decodeStatus(stdout), { isolation: "isolated", problems: [{ code: "env-missing", message: ".env.local is missing", fix: "wtm env feat" }], missingEnv: [".env.local"] });
});

test("decodeTree flattens the forest by path", () => {
  const status = (over = {}) => ({ commits_ahead: 0, is_dirty: false, needs_sync: false, ...over });
  const stdout = JSON.stringify({
    roots: [
      { branch: "main", path: "/dev/app", is_virtual: false, status: status(), children: [{ branch: "feat", path: "/w/feat", is_virtual: false, status: status({ commits_ahead: 4, is_dirty: true, needs_sync: true }), pr: { number: 128, url: "https://github.com/o/r/pull/128", state: "OPEN" }, children: [] }] },
      { branch: "gone", path: "", is_virtual: true, children: [] },
    ],
  });
  const tree = decodeTree(stdout);
  assert.deepEqual(Object.keys(tree).sort(), ["/dev/app", "/w/feat"]);
  assert.deepEqual(tree["/w/feat"], { ahead: 4, dirty: true, needsSync: true, pr: { number: 128, state: "OPEN", url: "https://github.com/o/r/pull/128" } });
  assert.deepEqual(tree["/dev/app"], { ahead: 0, dirty: false, needsSync: false, pr: null });
});

test("decodeProfiles reads the profile key", () => {
  const stdout = JSON.stringify({ job: [{ name: "api" }], profile: [{ name: "full", jobs: ["api", "web"], default: true }, { name: "api", jobs: ["api"] }] });
  assert.deepEqual(decodeProfiles(stdout), [{ name: "full", jobs: ["api", "web"], default: true }, { name: "api", jobs: ["api"], default: false }]);
});

test("decodePs reads started_at", () => {
  const stdout = JSON.stringify([{ name: "api", status: "running", branch: "feat", path: "/w/feat", started_at: "2026-11-07T10:00:00Z" }, { name: "web", branch: "feat", path: "/w/feat" }]);
  assert.deepEqual(decodePs(stdout), [
    { name: "api", branch: "feat", path: "/w/feat", status: "running", startedAt: Date.parse("2026-11-07T10:00:00Z") },
    { name: "web", branch: "feat", path: "/w/feat", status: null, startedAt: null },
  ]);
});

test("decodePrune counts pruned", () => {
  assert.equal(decodePrune(JSON.stringify({ pruned: [{ branch: "a" }, { branch: "b" }], dry_run: true })), 2);
});

test("every decoder returns its empty value on malformed output", () => {
  const inputs = ["", "not json", "[]", "null", "gh: not logged in", '"text"'];
  const cases = [
    [decodeStatus, null],
    [decodeTree, {}],
    [decodeProfiles, []],
    [decodePs, []],
    [decodePrune, 0],
  ];
  for (const [decoder, empty] of cases) {
    for (const input of inputs) {
      if (decoder === decodePs && input === "[]") continue;
      assert.deepEqual(decoder(input), empty, `${decoder.name}(${JSON.stringify(input)})`);
    }
  }
  assert.deepEqual(decodePs("{}"), []);
});

test("webUrl keeps http and https addresses only", () => {
  assert.equal(webUrl("http://api.feat.app.localhost:11080"), "http://api.feat.app.localhost:11080");
  assert.equal(webUrl("https://github.com/o/r/pull/1"), "https://github.com/o/r/pull/1");
  assert.equal(webUrl("file:///etc/passwd"), null);
  assert.equal(webUrl("-a Calculator"), null);
  assert.equal(webUrl("javascript:alert(1)"), null);
  assert.equal(webUrl(null), null);
});

test("decodeStatus keeps only fixes that run wtm", () => {
  const stdout = JSON.stringify({ problems: [{ code: "a", message: "m", fix: "wtm env 'feat'" }, { code: "b", message: "m", fix: "rm -rf ~" }] });
  assert.deepEqual(decodeStatus(stdout).problems.map((problem) => problem.code), ["a"]);
});

test("decodePs keeps each job's status", () => {
  assert.equal(decodePs(JSON.stringify([{ name: "a", branch: "x", path: "/x", status: "stopped" }]))[0].status, "stopped");
});
