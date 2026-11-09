import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, replay, sweep } from "../mods/wtm/sync.js";

const WT = "/dev/app.worktrees/feat";
const created = (worktree = {}) => ({ type: "worktree.created", repo: { common_dir: "/dev/app/.git" }, worktree: { path: WT, is_main: false, ...worktree } });
const removed = (worktree = {}) => ({ type: "worktree.removed", repo: { common_dir: "/dev/app/.git" }, worktree: { path: WT, is_main: false, ...worktree } });
const world = (over = {}) => ({ spaces: [{ id: "main", place: "/dev/app", folder: "/dev/app" }], focusedSpace: "main", pathExists: true, repoShown: true, ...over });

test("created opens the worktree and gives the focus back", () => {
  assert.deepEqual(decide({ event: created(), world: world() }), [{ kind: "open", folder: WT, reselect: "main" }]);
});

test("created without a focused space opens without reselecting", () => {
  assert.deepEqual(decide({ event: created(), world: world({ focusedSpace: null }) }), [{ kind: "open", folder: WT, reselect: null }]);
});

test("created does nothing for the main checkout", () => {
  assert.deepEqual(decide({ event: created({ is_main: true }), world: world() }), []);
});

test("created does nothing when the folder is already gone", () => {
  assert.deepEqual(decide({ event: created(), world: world({ pathExists: false }) }), []);
});

test("created does nothing in a repository the window does not show", () => {
  assert.deepEqual(decide({ event: created(), world: world({ repoShown: false }) }), []);
});

test("created does nothing when a space is already in the worktree", () => {
  const spaces = [{ id: "main", place: "/dev/app" }, { id: "s2", place: `${WT}/src` }];
  assert.deepEqual(decide({ event: created(), world: world({ spaces }) }), []);
});

test("removed closes the space at the worktree once its folder is gone", () => {
  const spaces = [{ id: "main", place: "/dev/app", folder: "/dev/app" }, { id: "s2", place: WT, folder: WT }];
  assert.deepEqual(decide({ event: removed(), world: world({ spaces, pathExists: false }) }), [{ kind: "close", id: "s2" }]);
});

test("removed closes a space whose place is a subfolder, and every such space", () => {
  const spaces = [
    { id: "s1", place: `${WT}/src`, folder: WT },
    { id: "s2", place: WT, folder: WT },
    { id: "s3", place: `${WT}-2`, folder: `${WT}-2` },
  ];
  assert.deepEqual(decide({ event: removed(), world: world({ spaces, pathExists: false }) }), [
    { kind: "close", id: "s1" },
    { kind: "close", id: "s2" },
  ]);
});

test("removed keeps the space while the folder still exists", () => {
  const spaces = [{ id: "s2", place: WT, folder: WT }];
  assert.deepEqual(decide({ event: removed(), world: world({ spaces, pathExists: true }) }), []);
});

test("removed never closes the main checkout", () => {
  const spaces = [{ id: "s2", place: WT, folder: WT }];
  assert.deepEqual(decide({ event: removed({ is_main: true }), world: world({ spaces, pathExists: false }) }), []);
});

test("removed without a space there does nothing", () => {
  assert.deepEqual(decide({ event: removed(), world: world({ pathExists: false }) }), []);
});

test("other event types do nothing", () => {
  for (const type of ["snapshot", "ready", "worktree.provisioned", "worktree.relocated"]) {
    assert.deepEqual(decide({ event: { type, worktree: { path: WT, is_main: false } }, world: world() }), [], type);
  }
});

test("an event without a worktree does nothing", () => {
  assert.deepEqual(decide({ event: { type: "worktree.created", repo: { common_dir: "/x" } }, world: world() }), []);
});

test("removed never closes a space made elsewhere whose terminal went into the worktree", () => {
  const spaces = [
    { id: "main", place: `${WT}/src`, folder: "/dev/app" },
    { id: "home", place: WT, folder: "" },
  ];
  assert.deepEqual(decide({ event: removed(), world: world({ spaces, pathExists: false }) }), []);
});

test("sweep closes every space marked gone, and only those", () => {
  const spaces = [
    { id: "s1", place: WT, folder: WT, gone: true },
    { id: "s2", place: "/dev/app", folder: "/dev/app", gone: false },
  ];
  assert.deepEqual(sweep({ world: { spaces } }), [{ kind: "close", id: "s1" }]);
});

test("replay turns a snapshot's worktrees into created events of its repository", () => {
  const repo = { common_dir: "/dev/app/.git" };
  const worktrees = [{ path: "/dev/app", is_main: true }, { path: WT, is_main: false }];
  assert.deepEqual(replay({ type: "snapshot", repo, worktrees }), [
    { type: "worktree.created", repo, worktree: worktrees[0] },
    { type: "worktree.created", repo, worktree: worktrees[1] },
  ]);
});

test("replay of a snapshot without a worktree list is empty", () => {
  for (const worktrees of [undefined, null, "x", { path: WT }]) assert.deepEqual(replay({ type: "snapshot", worktrees }), [], String(worktrees));
});

test("a replayed snapshot opens only the linked worktrees", () => {
  const events = replay({ type: "snapshot", repo: { common_dir: "/dev/app/.git" }, worktrees: [{ path: "/dev/app", is_main: true }, { path: WT, is_main: false }] });
  assert.deepEqual(events.flatMap((event) => decide({ event, world: world() })), [{ kind: "open", folder: WT, reselect: "main" }]);
});
