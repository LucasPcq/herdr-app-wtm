import { test } from "node:test";
import assert from "node:assert/strict";
import { inside, normalize, placeOf } from "../mods/wtm/paths.js";

test("normalize strips trailing slashes but keeps /", () => {
  assert.equal(normalize("/a/b/"), "/a/b");
  assert.equal(normalize("/a/b//"), "/a/b");
  assert.equal(normalize("/"), "/");
});

test("inside accepts the folder itself and a child", () => {
  assert.ok(inside("/a/b", "/a/b"));
  assert.ok(inside("/a/b/c", "/a/b/"));
});

test("inside rejects a sibling sharing a prefix", () => {
  assert.equal(inside("/a/b-2", "/a/b"), false);
  assert.equal(inside("/a", "/a/b"), false);
});

test("placeOf prefers the first pane cwd of the space's tabs, else folder, else null", () => {
  const space = { folder: "/repo", tabs: [{ id: "t1" }, { id: "t2" }] };
  const panes = [
    { tab: "other", cwd: "/elsewhere" },
    { tab: "t2", cwd: null },
    { tab: "t2", cwd: "/repo/sub" },
  ];
  assert.equal(placeOf(space, panes), "/repo/sub");
  assert.equal(placeOf(space, []), "/repo");
  assert.equal(placeOf({ folder: "", tabs: [] }, []), null);
});
