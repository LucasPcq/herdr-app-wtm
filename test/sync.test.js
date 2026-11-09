import { test } from "node:test";
import assert from "node:assert/strict";
import { decide } from "../mods/wtm/sync.js";

const WT = "/dev/app.worktrees/feat";
const created = (worktree = {}) => ({ type: "worktree.created", repo: { common_dir: "/dev/app/.git" }, worktree: { path: WT, is_main: false, ...worktree } });
const removed = (worktree = {}) => ({ type: "worktree.removed", repo: { common_dir: "/dev/app/.git" }, worktree: { path: WT, is_main: false, ...worktree } });
const world = (over = {}) => ({ spaces: [{ id: "main", place: "/dev/app", folder: "/dev/app" }], focusedSpace: "main", pathExists: true, repoShown: true, ...over });

test("created opens the worktree and gives the focus back", () => {
  assert.deepEqual(decide(created(), world()), [{ kind: "open", folder: WT, reselect: "main" }]);
});

test("created without a focused space opens without reselecting", () => {
  assert.deepEqual(decide(created(), world({ focusedSpace: null })), [{ kind: "open", folder: WT, reselect: null }]);
});

test("created does nothing for the main checkout", () => {
  assert.deepEqual(decide(created({ is_main: true }), world()), []);
});

test("created does nothing when the folder is already gone", () => {
  assert.deepEqual(decide(created(), world({ pathExists: false })), []);
});

test("created does nothing in a repository the window does not show", () => {
  assert.deepEqual(decide(created(), world({ repoShown: false })), []);
});

test("created does nothing when a space is already in the worktree", () => {
  const spaces = [{ id: "main", place: "/dev/app" }, { id: "s2", place: `${WT}/src` }];
  assert.deepEqual(decide(created(), world({ spaces })), []);
});

test("removed closes the space at the worktree once its folder is gone", () => {
  const spaces = [{ id: "main", place: "/dev/app", folder: "/dev/app" }, { id: "s2", place: WT, folder: WT }];
  assert.deepEqual(decide(removed(), world({ spaces, pathExists: false })), [{ kind: "close", id: "s2" }]);
});

test("removed closes a space whose place is a subfolder, and every such space", () => {
  const spaces = [
    { id: "s1", place: `${WT}/src`, folder: WT },
    { id: "s2", place: WT, folder: WT },
    { id: "s3", place: `${WT}-2`, folder: `${WT}-2` },
  ];
  assert.deepEqual(decide(removed(), world({ spaces, pathExists: false })), [
    { kind: "close", id: "s1" },
    { kind: "close", id: "s2" },
  ]);
});

test("removed keeps the space while the folder still exists", () => {
  const spaces = [{ id: "s2", place: WT, folder: WT }];
  assert.deepEqual(decide(removed(), world({ spaces, pathExists: true })), []);
});

test("removed never closes the main checkout", () => {
  const spaces = [{ id: "s2", place: WT, folder: WT }];
  assert.deepEqual(decide(removed({ is_main: true }), world({ spaces, pathExists: false })), []);
});

test("removed without a space there does nothing", () => {
  assert.deepEqual(decide(removed(), world({ pathExists: false })), []);
});

test("other event types do nothing", () => {
  for (const type of ["snapshot", "ready", "worktree.provisioned", "worktree.relocated"]) {
    assert.deepEqual(decide({ type, worktree: { path: WT, is_main: false } }, world()), [], type);
  }
});

test("an event without a worktree does nothing", () => {
  assert.deepEqual(decide({ type: "worktree.created", repo: { common_dir: "/x" } }, world()), []);
});

test("removed never closes a space made elsewhere whose terminal went into the worktree", () => {
  const spaces = [
    { id: "main", place: `${WT}/src`, folder: "/dev/app" },
    { id: "home", place: WT, folder: "" },
  ];
  assert.deepEqual(decide(removed(), world({ spaces, pathExists: false })), []);
});
