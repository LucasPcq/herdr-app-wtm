import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInbox, parse, pending, staleClaims } from "../mods/wtm/inbox.js";

const nodeIo = (now = () => Date.now()) => ({
  list: (dir) => readdir(dir),
  read: (path) => readFile(path, "utf8"),
  move: (from, to) => rename(from, to).then(() => true, () => false),
  remove: (path) => rm(path, { force: true }),
  now,
});

test("pending orders numerically, not lexically", () => {
  assert.deepEqual(pending(["10.json", "9.json", "1794239042000002.json", "1794239042000010.json"]), [
    "9.json",
    "10.json",
    "1794239042000002.json",
    "1794239042000010.json",
  ]);
});

test("pending ignores the worker's .tmp and claimed files", () => {
  assert.deepEqual(pending([".tmp", "5.json.abc.1000", "notes.txt", "5.json"]), ["5.json"]);
});

test("staleClaims returns only claims older than a minute, back to their pending name", () => {
  const now = 1_000_000;
  assert.deepEqual(staleClaims(["5.json.abc.900000", "6.json.def.990000", "7.json"], now), [{ from: "5.json.abc.900000", to: "5.json" }]);
});

test("parse returns the event, or null for a line that is not a JSON object", () => {
  assert.deepEqual(parse('{"type":"ready"}\n'), { type: "ready" });
  assert.equal(parse("warning: something\n"), null);
  assert.equal(parse("42"), null);
  assert.equal(parse(""), null);
});

test("take claims pending files in order and done removes them", async () => {
  const dir = await mkdtemp(join(tmpdir(), "inbox-"));
  await writeFile(join(dir, "2.json"), '{"type":"b"}\n');
  await writeFile(join(dir, "1.json"), '{"type":"a"}\n');
  await writeFile(join(dir, "3.json"), "not json\n");
  const inbox = createInbox({ dir, copyId: "c1", io: nodeIo() });
  const taken = await inbox.take();
  assert.deepEqual(taken.map((t) => t.event), [{ type: "a" }, { type: "b" }, null]);
  for (const t of taken) await inbox.done(t);
  assert.deepEqual(await readdir(dir), []);
});

test("concurrent claims take each file once", async () => {
  const dir = await mkdtemp(join(tmpdir(), "inbox-"));
  for (let i = 1; i <= 50; i++) await writeFile(join(dir, `${i}.json`), JSON.stringify({ type: "e", i }));
  const a = createInbox({ dir, copyId: "a", io: nodeIo() });
  const b = createInbox({ dir, copyId: "b", io: nodeIo() });
  const [ta, tb] = await Promise.all([a.take(), b.take()]);
  const ids = [...ta, ...tb].map((t) => t.event.i).sort((x, y) => x - y);
  assert.deepEqual(ids, Array.from({ length: 50 }, (_, k) => k + 1));
});

test("releaseStale gives a dead copy's claims back", async () => {
  const dir = await mkdtemp(join(tmpdir(), "inbox-"));
  await writeFile(join(dir, "4.json.dead.1000"), '{"type":"a"}');
  await writeFile(join(dir, "5.json.live.995000"), '{"type":"b"}');
  const inbox = createInbox({ dir, copyId: "me", io: nodeIo(() => 1_000_000) });
  await inbox.releaseStale();
  assert.deepEqual((await readdir(dir)).sort(), ["4.json", "5.json.live.995000"]);
});
