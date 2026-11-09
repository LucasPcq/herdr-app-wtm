import { BACKOFF_MAX_MS, BACKOFF_MIN_MS, EXIT_EVENT, FINAL_EXIT_CODES, SCRIPT_VERSION, WORKER_LABEL, WORKER_NAME } from "./constants.js";

// Runs wtm's event stream and writes each line to <inbox>/<n>.json (write, then
// rename: watchFolder sees renames, not appends), then one exit marker with
// wtm's code, on a line of its own even if wtm's last line had no newline.
// $1: the inbox, $2: wtm's absolute path. Bump SCRIPT_VERSION on change.
export const SCRIPT = `inbox=$1; wtm=$2; n=$(date +%s)000000
{ cd / && "$wtm" events --output json; printf '\\n{"type":"${EXIT_EVENT}","code":%d}\\n' "$?"; } |
while IFS= read -r line; do
  [ -n "$line" ] || continue
  n=$((n + 1))
  printf '%s\\n' "$line" > "$inbox/.tmp" && mv "$inbox/.tmp" "$inbox/$n.json"
done`;

export function runArgs({ inbox, wtm }) {
  return ["run", "--bg", "--name", WORKER_NAME, "--outlive-parent", "--label", `${WORKER_LABEL}=${SCRIPT_VERSION}`, "--", "sh", "-c", SCRIPT, "sh", inbox, wtm];
}

export function shouldReuse(info, wtm) {
  return info?.state === "live" && info.labels?.[WORKER_LABEL] === SCRIPT_VERSION && info.argv?.at(-1) === wtm;
}

export function nextBackoff(previousMs) {
  return previousMs == null ? BACKOFF_MIN_MS : Math.min(previousMs * 2, BACKOFF_MAX_MS);
}

export function isFinal(code) {
  return FINAL_EXIT_CODES.includes(code);
}

function decode(result) {
  if (result.code !== 0) return null;
  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

function workerInfo(hc) {
  return hc(["get", WORKER_NAME, "--json"]).then(decode);
}

// `hc` is the host's: (args) => Promise<{ code, stdout, stderr }>.
export async function workerRunning({ hc, wtm }) {
  return shouldReuse(await workerInfo(hc), wtm);
}

export async function ensureWorker({ hc, inbox, wtm }) {
  const info = await workerInfo(hc);
  if (shouldReuse(info, wtm)) return;
  if (info) {
    if (info.state === "live") await hc(["kill", WORKER_NAME]);
    await hc(["rm", WORKER_NAME]);
  }
  const started = await hc(runArgs({ inbox, wtm }));
  if (started.code !== 0) throw new Error((started.stderr || started.stdout || "hc run failed").trim());
}

export async function stopWorker({ hc }) {
  await hc(["kill", WORKER_NAME]);
  await hc(["rm", WORKER_NAME]);
}
