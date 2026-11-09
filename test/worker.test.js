import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SCRIPT, ensureWorker, isFinal, nextBackoff, runArgs, shouldReuse, stopWorker, workerRunning } from "../mods/wtm/worker.js";

async function fakeWtm(body) {
  const dir = await mkdtemp(join(tmpdir(), "wtm-"));
  const path = join(dir, "wtm");
  await writeFile(path, `#!/bin/sh\n${body}\n`);
  await chmod(path, 0o755);
  return path;
}

test("the script turns each line into one numbered file, then an exit marker", async () => {
  const inbox = await mkdtemp(join(tmpdir(), "inbox-"));
  const wtm = await fakeWtm(`printf '{"args":"%s","pwd":"%s"}\\n' "$*" "$(pwd)"\necho '{"type":"a"}'\necho 'not json'\nprintf '{"type":"b"}'\nexit 7`);
  const run = spawnSync("sh", ["-c", SCRIPT, "sh", inbox, wtm, "r42"], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);

  const names = await readdir(inbox);
  assert.ok(names.every((n) => /^\d+\.json$/.test(n)), names.join(","));
  const ordered = names.sort((a, b) => Number(a.slice(0, -5)) - Number(b.slice(0, -5)));
  const lines = await Promise.all(ordered.map((n) => readFile(join(inbox, n), "utf8")));
  assert.deepEqual(lines, [
    '{"args":"events --output json","pwd":"/"}\n',
    '{"type":"a"}\n',
    "not json\n",
    '{"type":"b"}\n',
    '{"type":"herdr-app-wtm.exit","code":7,"run":"r42"}\n',
  ]);
});

test("runArgs starts a named, labelled, hidden worker that outlives its parent", () => {
  const args = runArgs({ inbox: "/home/u/.local/state/herdr-app-wtm/inbox", wtm: "/bin/wtm", run: "r42" });
  assert.deepEqual(args.slice(0, 10), ["run", "--bg", "--name", "herdr-app-wtm", "--outlive-parent", "--label", "herdr-app-wtm.script=2", "--label", "herdr-app-wtm.run=r42", "--"]);
  assert.deepEqual(args.slice(10, 12), ["sh", "-c"]);
  assert.deepEqual(args.slice(13), ["sh", "/home/u/.local/state/herdr-app-wtm/inbox", "/bin/wtm", "r42"]);
});

test("shouldReuse only a live worker of this script version on this wtm", () => {
  const live = { state: "live", labels: { "herdr-app-wtm.script": "2" }, argv: ["sh", "-c", "…", "sh", "/inbox", "/bin/wtm", "r1"] };
  assert.equal(shouldReuse(live, "/bin/wtm"), true);
  assert.equal(shouldReuse({ ...live, state: "finished" }, "/bin/wtm"), false);
  assert.equal(shouldReuse({ ...live, labels: { "herdr-app-wtm.script": "0" } }, "/bin/wtm"), false);
  assert.equal(shouldReuse(live, "/opt/wtm"), false);
  assert.equal(shouldReuse(null, "/bin/wtm"), false);
});

test("nextBackoff starts at 1 s, doubles, and stops at 30 s", () => {
  assert.equal(nextBackoff(null), 1_000);
  assert.equal(nextBackoff(1_000), 2_000);
  assert.equal(nextBackoff(16_000), 30_000);
  assert.equal(nextBackoff(30_000), 30_000);
});

test("isFinal is true only for wtm's no-retry codes", () => {
  assert.equal(isFinal(2), true);
  assert.equal(isFinal(20), true);
  assert.equal(isFinal(1), false);
  assert.equal(isFinal(0), false);
});

function fakeHc(answers) {
  const calls = [];
  const hc = async (args) => {
    calls.push(args.slice(0, 2).join(" "));
    return answers[args[0]] ?? { code: 0, stdout: "{}", stderr: "" };
  };
  return { hc, calls };
}

test("ensureWorker reuses a matching worker", async () => {
  const info = { state: "live", labels: { "herdr-app-wtm.script": "2", "herdr-app-wtm.run": "old" }, argv: ["/bin/wtm", "old"] };
  const { hc, calls } = fakeHc({ get: { code: 0, stdout: JSON.stringify(info), stderr: "" } });
  assert.equal(await ensureWorker({ hc, inbox: "/i", wtm: "/bin/wtm", run: "new" }), "old");
  assert.deepEqual(calls, ["get herdr-app-wtm"]);
});

test("ensureWorker replaces an outdated live worker", async () => {
  const info = { state: "live", labels: { "herdr-app-wtm.script": "0" }, argv: ["/bin/wtm", "r1"] };
  const { hc, calls } = fakeHc({ get: { code: 0, stdout: JSON.stringify(info), stderr: "" } });
  await ensureWorker({ hc, inbox: "/i", wtm: "/bin/wtm" });
  assert.deepEqual(calls, ["get herdr-app-wtm", "kill herdr-app-wtm", "rm herdr-app-wtm", "run --bg"]);
});

test("ensureWorker starts one when none exists", async () => {
  const { hc, calls } = fakeHc({ get: { code: 3, stdout: "", stderr: "not found" } });
  assert.equal(await ensureWorker({ hc, inbox: "/i", wtm: "/bin/wtm", run: "new" }), "new");
  assert.deepEqual(calls, ["get herdr-app-wtm", "run --bg"]);
});

test("ensureWorker fails with hc's message when the worker cannot start", async () => {
  const { hc } = fakeHc({ get: { code: 3, stdout: "", stderr: "" }, run: { code: 1, stdout: "", stderr: "no core" } });
  await assert.rejects(ensureWorker({ hc, inbox: "/i", wtm: "/bin/wtm" }), /no core/);
});

test("stopWorker kills then removes the worker", async () => {
  const { hc, calls } = fakeHc({});
  await stopWorker({ hc });
  assert.deepEqual(calls, ["kill herdr-app-wtm", "rm herdr-app-wtm"]);
});

test("workerRunning is true only while a matching worker is live", async () => {
  const info = { state: "live", labels: { "herdr-app-wtm.script": "2" }, argv: ["/bin/wtm", "r1"] };
  assert.equal(await workerRunning({ hc: fakeHc({ get: { code: 0, stdout: JSON.stringify(info), stderr: "" } }).hc, wtm: "/bin/wtm" }), true);
  const done = { ...info, state: "finished" };
  assert.equal(await workerRunning({ hc: fakeHc({ get: { code: 0, stdout: JSON.stringify(done), stderr: "" } }).hc, wtm: "/bin/wtm" }), false);
  assert.equal(await workerRunning({ hc: fakeHc({ get: { code: 3, stdout: "", stderr: "" } }).hc, wtm: "/bin/wtm" }), false);
});
