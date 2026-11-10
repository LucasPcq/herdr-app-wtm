import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_MODEL, reduce, seed } from "../mods/wtm/model.js";

const REPO = { root: "/dev/app", common_dir: "/dev/app/.git" };
const FEAT = "/dev/app.worktrees/feat";

const snapshot = (worktrees, repo = REPO) => ({ type: "snapshot", repo, worktrees });
const wt = (branch, path, parent = "main", over = {}) => ({ branch, path, parent, is_main: false, ...over });
const job = (type, over = {}) => ({ type, repo: REPO, worktree: { branch: "feat", path: FEAT }, job: { name: "api", kind: "service", url: "http://api.localhost" }, ...over });

const base = () =>
  reduce({
    model: EMPTY_MODEL,
    event: snapshot([wt("main", "/dev/app", "", { is_main: true }), wt("feat", FEAT)]),
  });

function deepFreeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

test("snapshot replaces a repository's worktrees and jobs", () => {
  const old = reduce({ model: EMPTY_MODEL, event: snapshot([wt("old", "/dev/app.worktrees/old")]) });
  const model = reduce({
    model: old,
    event: snapshot([
      wt("main", "/dev/app", "", { is_main: true, jobs: [{ name: "db", kind: "service", state: "running", url: "http://localhost:5432", shared: true }] }),
      wt("feat", FEAT, "main", { jobs: null }),
    ]),
  });
  const repo = model.repos["/dev/app/.git"];
  assert.deepEqual(Object.keys(repo.worktrees).sort(), ["feat", "main"]);
  assert.equal(repo.root, "/dev/app");
  assert.equal(repo.worktrees.main.parent, null);
  assert.equal(repo.worktrees.main.isMain, true);
  assert.equal(repo.worktrees.feat.parent, "main");
  assert.deepEqual(repo.worktrees.main.jobs.db, { name: "db", kind: "service", state: "running", url: "http://localhost:5432", shared: true, exitCode: null });
  assert.deepEqual(repo.worktrees.feat.jobs, {});
});

test("snapshot leaves other repositories alone", () => {
  const other = { root: "/dev/web", common_dir: "/dev/web/.git" };
  const model = reduce({ model: base(), event: snapshot([wt("main", "/dev/web", "", { is_main: true })], other) });
  assert.deepEqual(Object.keys(model.repos).sort(), ["/dev/app/.git", "/dev/web/.git"]);
  assert.ok(model.repos["/dev/app/.git"].worktrees.feat);
});

test("created and reparented upsert a worktree and keep its jobs", () => {
  const running = reduce({ model: base(), event: job("job.started") });
  const created = reduce({ model: running, event: { type: "worktree.created", repo: REPO, worktree: wt("feat-ui", "/dev/app.worktrees/feat-ui", "feat") } });
  assert.equal(created.repos["/dev/app/.git"].worktrees["feat-ui"].parent, "feat");
  const moved = reduce({ model: created, event: { type: "worktree.reparented", repo: REPO, worktree: wt("feat", FEAT, "develop"), from_parent: "main" } });
  assert.equal(moved.repos["/dev/app/.git"].worktrees.feat.parent, "develop");
  assert.equal(moved.repos["/dev/app/.git"].worktrees.feat.jobs.api.state, "running");
});

test("removed deletes the worktree", () => {
  const model = reduce({ model: base(), event: { type: "worktree.removed", repo: REPO, worktree: wt("feat", FEAT) } });
  assert.deepEqual(Object.keys(model.repos["/dev/app/.git"].worktrees), ["main"]);
});

test("repo.removed deletes the repository", () => {
  const model = reduce({ model: base(), event: { type: "repo.removed", repo: REPO } });
  assert.deepEqual(model.repos, {});
});

test("job.started marks running, job.stopped and job.exited mark stopped, job.crashed marks crashed with its exit code", () => {
  const at = (model) => model.repos["/dev/app/.git"].worktrees.feat.jobs.api;
  const started = reduce({ model: base(), event: job("job.started") });
  assert.equal(at(started).state, "running");
  assert.equal(at(started).url, "http://api.localhost");
  assert.equal(at(reduce({ model: started, event: job("job.stopped") })).state, "stopped");
  assert.equal(at(reduce({ model: started, event: job("job.exited", { exit_code: 0 }) })).state, "stopped");
  const crashed = at(reduce({ model: started, event: job("job.crashed", { exit_code: 1 }) }));
  assert.equal(crashed.state, "crashed");
  assert.equal(crashed.exitCode, 1);
});

test("a shared job event also updates every held_by worktree", () => {
  const event = job("job.started", { worktree: { branch: "main", path: "/dev/app" }, job: { name: "db", kind: "service", shared: true }, held_by: [{ branch: "feat", path: FEAT }] });
  const model = reduce({ model: base(), event });
  assert.equal(model.repos["/dev/app/.git"].worktrees.main.jobs.db.state, "running");
  assert.equal(model.repos["/dev/app/.git"].worktrees.feat.jobs.db.state, "running");
  assert.equal(model.repos["/dev/app/.git"].worktrees.feat.jobs.db.shared, true);
});

test("a job event for an unknown repository or branch creates them", () => {
  const model = reduce({ model: EMPTY_MODEL, event: job("job.started") });
  const repo = model.repos["/dev/app/.git"];
  assert.equal(repo.root, "/dev/app");
  assert.deepEqual({ ...repo.worktrees.feat, jobs: undefined }, { branch: "feat", path: FEAT, parent: null, isMain: false, jobs: undefined });
  assert.equal(repo.worktrees.feat.jobs.api.state, "running");
});

test("an event without repo.common_dir, without worktree.branch, or of an unknown type returns the same model", () => {
  const model = base();
  assert.equal(reduce({ model, event: { type: "worktree.created", repo: {}, worktree: wt("x", "/x") } }), model);
  assert.equal(reduce({ model, event: { type: "job.started", repo: REPO, worktree: { path: FEAT }, job: { name: "api" } } }), model);
  assert.equal(reduce({ model, event: { type: "ready" } }), model);
  assert.equal(reduce({ model, event: { type: "worktree.provisioned", repo: REPO, worktree: wt("feat", FEAT), ok: true } }), model);
  assert.equal(reduce({ model, event: null }), model);
});

test("reduce never mutates its input", () => {
  const model = deepFreeze(base());
  assert.doesNotThrow(() => {
    reduce({ model, event: job("job.started") });
    reduce({ model, event: { type: "worktree.removed", repo: REPO, worktree: wt("feat", FEAT) } });
    reduce({ model, event: snapshot([]) });
    reduce({ model, event: { type: "repo.removed", repo: REPO } });
  });
});

test("seed takes a stored model, else the empty one", () => {
  const stored = base();
  assert.equal(seed(stored), stored);
  assert.equal(seed(null), null);
  assert.equal(seed({ repos: [] }), null);
  assert.equal(seed("x"), null);
});
