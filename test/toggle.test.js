import { test } from "node:test";
import assert from "node:assert/strict";
import { paneOpen, toggle } from "../mods/wtm/toggle.js";

const MOD = "wtm";
const terminal = (pane, tab) => ({ pane, terminal: `t-${pane}`, tab });
const modPane = (pane, tab, mod = MOD) => ({ pane, terminal: null, mod, tab });

test("opens beside the focused pane", () => {
  const panes = [terminal("p1", "tab1"), terminal("p2", "tab1")];
  assert.deepEqual(toggle({ focused: { tab: "tab1", pane: "p2" }, panes, mod: MOD }), { kind: "open", pane: "p2", tab: "tab1" });
});

test("opens beside the tab's first pane when no pane is focused", () => {
  const panes = [terminal("p0", "tab0"), terminal("p1", "tab1")];
  assert.deepEqual(toggle({ focused: { tab: "tab1", pane: null }, panes, mod: MOD }), { kind: "open", pane: "p1", tab: "tab1" });
});

test("closes this mod's pane in the active tab", () => {
  const panes = [terminal("p1", "tab1"), modPane("m1", "tab1")];
  assert.deepEqual(toggle({ focused: { tab: "tab1", pane: "p1" }, panes, mod: MOD }), { kind: "close", pane: "m1" });
});

test("ignores this mod's pane in another tab", () => {
  const panes = [terminal("p1", "tab1"), modPane("m2", "tab2"), modPane("x1", "tab1", "files")];
  assert.deepEqual(toggle({ focused: { tab: "tab1", pane: "p1" }, panes, mod: MOD }), { kind: "open", pane: "p1", tab: "tab1" });
});

test("does nothing without a focused tab, or in a tab with no pane", () => {
  assert.equal(toggle({ focused: null, panes: [terminal("p1", "tab1")], mod: MOD }), null);
  assert.equal(toggle({ focused: { tab: "tab9", pane: null }, panes: [terminal("p1", "tab1")], mod: MOD }), null);
});

test("paneOpen is true only for the active tab", () => {
  const panes = [terminal("p1", "tab1"), modPane("m2", "tab2")];
  assert.equal(paneOpen({ focused: { tab: "tab2" }, panes, mod: MOD }), true);
  assert.equal(paneOpen({ focused: { tab: "tab1" }, panes, mod: MOD }), false);
  assert.equal(paneOpen({ focused: null, panes, mod: MOD }), false);
});
