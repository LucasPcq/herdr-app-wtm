import { test } from "node:test";
import assert from "node:assert/strict";
import { actionRepo, activeProfile, age, contextOf, elsewhere, forest, indicator, running } from "../mods/wtm/stacks.js";

const wt = (branch, parent = null, jobs = {}, path = `/w/${branch}`) => ({ branch, path, parent, isMain: parent === null, jobs });
const job = (name, state) => ({ name, kind: "service", state, url: null, shared: false, exitCode: null });
const repoOf = (list, root = "/dev/app") => ({ root, commonDir: `${root}/.git`, worktrees: Object.fromEntries(list.map((w) => [w.branch, w])) });
const rows = (repo) => forest({ repo }).map((row) => `${row.branch} ${row.depth}${row.virtual ? " virtual" : ""}`);

test("forest puts children under their parent with depth", () => {
  const repo = repoOf([wt("fix", "main"), wt("main"), wt("feat-ui", "feat"), wt("feat", "main")]);
  assert.deepEqual(rows(repo), ["main 0", "feat 1", "feat-ui 2", "fix 1"]);
});

test("forest shows a missing parent as a virtual root", () => {
  const repo = repoOf([wt("feature/luc-333", "feature/luc-332")]);
  assert.deepEqual(forest({ repo }), [
    { branch: "feature/luc-332", path: null, depth: 0, virtual: true },
    { branch: "feature/luc-333", path: "/w/feature/luc-333", depth: 1, virtual: false },
  ]);
});

test("forest lists each worktree of a parent cycle once", () => {
  const repo = repoOf([wt("a", "b"), wt("b", "a")]);
  const branches = forest({ repo }).map((row) => row.branch).sort();
  assert.deepEqual(branches, ["a", "b"]);
});

test("indicator prefers crashed, then needs sync, then running with its count, else null", () => {
  const tree = { "/w/feat": { needsSync: true } };
  assert.deepEqual(indicator({ worktree: wt("feat", "main", { api: job("api", "crashed"), web: job("web", "running") }), tree }), { kind: "crashed" });
  assert.deepEqual(indicator({ worktree: wt("feat", "main", { web: job("web", "running") }), tree }), { kind: "needsSync" });
  assert.deepEqual(indicator({ worktree: wt("feat", "main", { web: job("web", "running"), db: job("db", "starting"), x: job("x", "stopped") }), tree: {} }), { kind: "running", count: 2 });
  assert.equal(indicator({ worktree: wt("feat", "main"), tree: {} }), null);
});

test("contextOf picks the longest matching worktree", () => {
  const model = { repos: { "/dev/app/.git": repoOf([wt("main", null, {}, "/w"), wt("feat-auth", "main", {}, "/w/feat-auth"), wt("feat-auth-ui", "main", {}, "/w/feat-auth-ui")]) } };
  assert.deepEqual(contextOf({ model, folder: "/w/feat-auth-ui/src" }), { commonDir: "/dev/app/.git", branch: "feat-auth-ui" });
  assert.deepEqual(contextOf({ model, folder: "/w/feat-auth" }), { commonDir: "/dev/app/.git", branch: "feat-auth" });
  assert.deepEqual(contextOf({ model, folder: "/w/docs" }), { commonDir: "/dev/app/.git", branch: "main" });
  assert.equal(contextOf({ model, folder: "/elsewhere" }), null);
  assert.equal(contextOf({ model, folder: null }), null);
});

test("actionRepo uses the context, else the only shown repository, else null", () => {
  assert.equal(actionRepo({ context: { commonDir: "/a/.git", branch: "x" }, shown: ["/b/.git", "/c/.git"] }), "/a/.git");
  assert.equal(actionRepo({ context: null, shown: ["/a/.git"] }), "/a/.git");
  assert.equal(actionRepo({ context: null, shown: ["/a/.git", "/b/.git"] }), null);
  assert.equal(actionRepo({ context: null, shown: [] }), null);
});

test("activeProfile infers the profile whose jobs all run, else the default", () => {
  const profiles = [
    { name: "full", jobs: ["api", "web"], default: true },
    { name: "api", jobs: ["api"], default: false },
  ];
  assert.equal(activeProfile({ profiles, jobs: { api: job("api", "running"), web: job("web", "stopped") } }), "api");
  assert.equal(activeProfile({ profiles, jobs: { api: job("api", "running"), web: job("web", "starting") } }), "full");
  assert.equal(activeProfile({ profiles, jobs: {} }), "full");
  assert.equal(activeProfile({ profiles: [{ name: "only", jobs: ["x"], default: false }], jobs: {} }), "only");
  assert.equal(activeProfile({ profiles: [], jobs: {} }), null);
});

test("elsewhere lists running worktrees of repositories not shown", () => {
  const shownRepo = repoOf([wt("main", null, { api: job("api", "running") })], "/dev/app");
  const other = repoOf([wt("main", null, { db: job("db", "running"), web: job("web", "starting") }, "/dev/web"), wt("feat", "main", { x: job("x", "stopped") })], "/dev/web");
  const model = { repos: { [shownRepo.commonDir]: shownRepo, [other.commonDir]: other } };
  assert.deepEqual(elsewhere({ model, shown: ["/dev/app/.git"] }), [{ commonDir: "/dev/web/.git", root: "/dev/web", branch: "main", path: "/dev/web", running: 2 }]);
});

test("running counts running and starting jobs", () => {
  assert.equal(running({ jobs: { a: job("a", "running"), b: job("b", "starting"), c: job("c", "crashed") } }), 2);
  assert.equal(running({ jobs: undefined }), 0);
});

test("age reads minutes, hours, then days, and nothing without a start", () => {
  const now = Date.parse("2026-11-10T12:00:00Z");
  assert.equal(age({ since: now - 12 * 60_000, now }), "12 min");
  assert.equal(age({ since: now - 30_000, now }), "1 min");
  assert.equal(age({ since: now - 6 * 3_600_000, now }), "6 h");
  assert.equal(age({ since: now - 3 * 86_400_000, now }), "3 d");
  assert.equal(age({ since: null, now }), null);
});
