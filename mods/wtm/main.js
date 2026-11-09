// wtm worktrees as Herdr spaces. Two copies of this mod exist: the launcher
// (what `mod.open` shows) opens the kept window and closes; the service copy
// (that window, reopened on every start) runs the worker and draws the pill.

import { View, div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { closeOverlay, exec, hc, home, nextCommand, notify, openOverlay, props, run, theme, watchFolder } from "herdr";
import * as fs from "fs/promises";
import { COMMAND, EVENT, EXIT_EVENT, FALLBACK_DRAIN_MS, INBOX_DIR, MESSAGES, MIN_EVENTS, MOD, NOTIFY_TITLE, STATE, WINDOW_KEY, WTM_BIN } from "./constants.js";
import { createInbox } from "./inbox.js";
import { style } from "./style.js";
import { decide } from "./sync.js";
import { ensureWorker, isFinal, nextBackoff, stopWorker, workerRunning } from "./worker.js";
import { buildWorld } from "./world.js";

const BLOCKED = new Set([STATE.wtmMissing, STATE.wtmTooOld, STATE.streamStopped, STATE.error]);

// The inbox through the mod's host: fs reads (inside home), exec writes (fs may
// only write under ~/.config/herdr-app). mv fails when another copy took the file.
const hostIo = {
  list: (dir) => fs.readdir(dir),
  read: (path) => fs.readFile(path, "utf8"),
  move: async (from, to) => (await exec("mv", [from, to])).code === 0,
  remove: async (path) => {
    await exec("rm", ["-f", path]);
  },
  now: () => Date.now(),
};

export default class Wtm extends View {
  init(_props, cx) {
    if (!props()?.service) {
      this.launcher = true;
      openOverlay({ mod: MOD, kind: "window", key: WINDOW_KEY, keep: true, frame: "none", props: { service: true } });
      const own = props()?.overlay;
      if (own) closeOverlay(own);
      return;
    }
    this.state = STATE.starting;
    this.copyId = Math.random().toString(36).slice(2, 10);
    this.repos = new Map();
    this.backoff = null;
    this.inbox = null;
    this.wtm = null;
    this.watching = false;
    this.draining = false;
    this.drainAgain = false;
    cx.spawn(async (cx) => this.start(cx));
    cx.spawn(async (cx) => this.listenForCommands(cx));
    cx.timer.every(FALLBACK_DRAIN_MS, (cx) => cx.spawn(async (cx) => this.drain(cx)));
  }

  async start(cx) {
    this.set(STATE.starting, cx);
    const wtm = await this.findWtm();
    if (!wtm) return this.set(STATE.wtmMissing, cx);
    if (!(await this.hasEvents(wtm))) return this.set(STATE.wtmTooOld, cx);
    this.wtm = wtm;

    const dir = `${home()}/${INBOX_DIR}`;
    try {
      const made = await exec("mkdir", ["-p", dir]);
      if (made.code !== 0) throw new Error(made.stderr.trim() || `cannot create ${dir}`);
      await ensureWorker({ hc, inbox: dir, wtm });
      this.inbox = createInbox({ dir, copyId: this.copyId, io: hostIo });
      await this.inbox.releaseStale();
    } catch (error) {
      return this.set(STATE.error, cx, error.message ?? String(error));
    }

    this.set(STATE.listening, cx);
    await this.drain(cx);
    if (!this.watching) cx.spawn(async (cx) => this.watch(cx, dir));
  }

  async findWtm() {
    try {
      const found = await exec("which", [WTM_BIN]);
      return found.code === 0 ? found.stdout.trim() : null;
    } catch {
      return null;
    }
  }

  async hasEvents(wtm) {
    try {
      const version = await exec(wtm, ["version", "--output", "json"]);
      return version.code === 0 && JSON.parse(version.stdout).events >= MIN_EVENTS;
    } catch {
      return false;
    }
  }

  async watch(cx, dir) {
    this.watching = true;
    try {
      for (;;) {
        await watchFolder(dir);
        await this.drain(cx);
      }
    } catch (error) {
      this.set(STATE.error, cx, error.message ?? String(error));
    } finally {
      this.watching = false;
    }
  }

  // Watch batches and the fallback timer both drain: one drain at a time,
  // and a request arriving mid-drain runs one more pass.
  async drain(cx) {
    if (!this.inbox) return;
    if (this.draining) {
      this.drainAgain = true;
      return;
    }
    this.draining = true;
    try {
      do {
        this.drainAgain = false;
        for (const claimed of await this.inbox.take()) {
          await this.handle(claimed.event, cx);
          await this.inbox.done(claimed);
        }
      } while (this.drainAgain);
    } catch (error) {
      this.set(STATE.error, cx, error.message ?? String(error));
    } finally {
      this.draining = false;
    }
  }

  async handle(event, cx) {
    if (!event) return;
    if (event.type === EXIT_EVENT) return this.exited(event.code, cx);
    if (event.type === EVENT.ready) {
      this.backoff = null;
      return;
    }
    if ((event.type !== EVENT.created && event.type !== EVENT.removed) || !event.worktree?.path) return;
    try {
      for (const action of decide(event, await buildWorld(event, this.repos))) apply(action);
    } catch (error) {
      console.log(`wtm: ${event.type} ${event.worktree.path}: ${error.message ?? error}`);
    }
  }

  async exited(code, cx) {
    // A marker left in the backlog by a worker already replaced.
    if (await workerRunning({ hc, wtm: this.wtm })) return;
    if (isFinal(code)) return this.set(STATE.streamStopped, cx, code);
    this.backoff = nextBackoff(this.backoff);
    this.set(STATE.starting, cx);
    cx.timer.after(this.backoff, (cx) => cx.spawn(async (cx) => this.start(cx)));
  }

  async listenForCommands(cx) {
    for (;;) {
      if ((await nextCommand()) !== COMMAND.stop) continue;
      await stopWorker({ hc });
      closeOverlay(props().overlay);
      cx.notify();
      return;
    }
  }

  set(state, cx, detail) {
    const entering = state !== this.state;
    this.state = state;
    if (entering && BLOCKED.has(state)) notify({ title: NOTIFY_TITLE, body: message(state, detail), level: "error" });
    cx.notify();
  }

  render() {
    if (this.launcher) return div();
    const s = style(theme());
    const blocked = BLOCKED.has(this.state);
    return h_flex()
      .id("wtm-pill")
      .items_center()
      .gap(s.gap)
      .h(s.height)
      .px(s.padX)
      .rounded(s.radius)
      .border(s.border)
      .border_color(s.borderColor)
      .bg(s.background)
      .text_size(s.textSize)
      .text_color(s.foreground)
      .when(blocked, (el) =>
        el
          .cursor_pointer()
          .on_mouse_down("left", (_event, cx) => cx.stop_propagation())
          .on_click((_event, cx) => cx.spawn(async (cx) => this.start(cx))),
      )
      .child(div().flex_none().size(s.dotSize).rounded_full().bg(s.dot[this.state]))
      .child(div().child(s.labels[this.state]));
  }
}

function apply(action) {
  if (action.kind === "close") return run("space.close", { id: action.id, confirmed: true });
  run("space.new", { folder: action.folder });
  // space.new selects the new space: give the focus back.
  if (action.reselect) run("space.select", { id: action.reselect });
}

function message(state, detail) {
  if (state === STATE.streamStopped) return MESSAGES.stopped(detail);
  if (state === STATE.error) return MESSAGES.error(detail);
  return MESSAGES[state];
}
