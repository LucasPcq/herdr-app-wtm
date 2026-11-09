import { STALE_CLAIM_MS } from "./constants.js";

const PENDING = /^(\d+)\.json$/;
// <n>.json.<copyId>.<claimMs>
const CLAIMED = /^(\d+\.json)\.[A-Za-z0-9]+\.(\d+)$/;

export function pending(names) {
  return names.filter((name) => PENDING.test(name)).sort((a, b) => Number(a.match(PENDING)[1]) - Number(b.match(PENDING)[1]));
}

export function staleClaims(names, now) {
  return names.flatMap((name) => {
    const match = name.match(CLAIMED);
    return match && now - Number(match[2]) > STALE_CLAIM_MS ? [{ from: name, to: match[1] }] : [];
  });
}

// One event line, or null when it is not a JSON object: wtm's contract says skip it.
export function parse(text) {
  try {
    const value = JSON.parse(text);
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

// The worker's event files, claimed by renaming so that two copies of the mod
// never handle the same event. `io` is the host's file access: move resolves
// false when the file is gone (another copy took it).
export function createInbox({ dir, copyId, io }) {
  async function releaseStale() {
    for (const { from, to } of staleClaims(await io.list(dir), io.now())) {
      await io.move(`${dir}/${from}`, `${dir}/${to}`);
    }
  }

  return {
    releaseStale,

    // Releases first: a copy that died mid-batch left claims no start() may come to free.
    async take() {
      await releaseStale();
      const taken = [];
      for (const name of pending(await io.list(dir))) {
        const path = `${dir}/${name}.${copyId}.${io.now()}`;
        if (!(await io.move(`${dir}/${name}`, path))) continue;
        taken.push({ path, event: parse(await io.read(path)) });
      }
      return taken;
    },

    done(claimed) {
      return io.remove(claimed.path);
    },
  };
}
