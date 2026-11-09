import { test } from "node:test";
import assert from "node:assert/strict";
import { anchor } from "../mods/wtm/anchor.js";

const pill = { width: 64, height: 26 };
const at = (window, position) => anchor({ window, pill, position });

test("bottom center sits inset px above the window's bottom, centred", () => {
  assert.deepEqual(at({ width: 1280, height: 800 }, { edge: "bottom", align: "center", inset: 1, margin: 16 }), { x: 608, y: 773 });
});

test("top end keeps margin px from the right edge", () => {
  assert.deepEqual(at({ width: 1280, height: 800 }, { edge: "top", align: "end", inset: 8, margin: 16 }), { x: 1200, y: 8 });
});

test("start keeps margin px from the left edge", () => {
  assert.deepEqual(at({ width: 1280, height: 800 }, { edge: "bottom", align: "start", inset: 1, margin: 16 }), { x: 16, y: 773 });
});

test("odd sizes land on whole pixels and never off the window", () => {
  assert.deepEqual(at({ width: 1001, height: 20 }, { edge: "bottom", align: "center", inset: 1, margin: 16 }), { x: 469, y: 0 });
});
