# Architecture

herdr-app-wtm keeps the Herdr app's spaces in step with wtm's worktrees and shows them in a pane. Four things do the work: a long-lived **worker** in herdr-core, an **inbox** of event files, the mod's **service copy** (a kept window that draws the button and keeps the live model), and the **pane** (a mod pane the button opens).

```
herdr-app do mod.open wtm ──► launcher copy (dialog, half the window: measures it)
                                  │ openOverlay(kind: "window", key: "wtm", keep: true, at: anchor(...))
                                  ▼
                              service copy (reopened by Herdr on every start)
                                  │ ensureWorker
                                  ▼
hc run --bg --name herdr-app-wtm -- sh -c SCRIPT sh <inbox> <wtm> <run>
                                  │ cd / && wtm events --output json
                                  ▼
~/.local/state/herdr-app-wtm/inbox/<n>.json   (one per line: .tmp then mv)
                                  │ watchFolder + 30 s check
                                  ▼
service copy: take (claim by rename) → reduce({ model, event }) → setShared("wtm.model")
                                     → decide({ event, world }) → space.new + space.select / space.close
                                  │ click: toggle → pane.split { mod: "wtm", props: { pane, tab } }
                                  ▼
pane copy: shared("wtm.model") live + wtm status / tree / run list / run ps / prune --dry-run on demand
```

## Modules

| Module | Role |
| --- | --- |
| `constants.js` | every name, path, version, exit code, timing, event type, state and message |
| `paths.js` | `normalize`, `inside({ path, dir })`, `placeOf({ space, panes })` |
| `sync.js` | `decide({ event, world })` → `{ kind: "open", folder, reselect }` or `{ kind: "close", id }`; `replay(snapshot)` → created events; `sweep({ world })` → close actions |
| `model.js` | `EMPTY_MODEL`, `reduce({ model, event })` → every repository's worktrees (branch, path, parent) and jobs (state, url, shared, exit code) |
| `decode.js` | `decodeStatus`, `decodeTree`, `decodeProfiles`, `decodePs`, `decodePrune`: wtm's on-demand JSON → shapes, empty on anything malformed |
| `stacks.js` | `forest({ repo })`, `indicator({ worktree, tree })`, `contextOf({ model, folder })`, `actionRepo({ context, shown })`, `activeProfile({ profiles, jobs })`, `elsewhere({ model, shown })`, `running({ jobs })` |
| `toggle.js` | `toggle({ focused, panes, mod })` → open beside a pane or close this mod's pane in the active tab; `paneOpen` |
| `anchor.js` | `anchor({ window, pill, position })` → `{ x, y }` |
| `inbox.js` | `pending`, `staleClaims`, `parse`, `createInbox({ dir, copyId, io })` → `take`, `done`, `releaseStale` |
| `worker.js` | `SCRIPT`, `runArgs`, `shouldReuse`, `nextBackoff`, `isFinal`, `ensureWorker`, `workerRunning`, `stopWorker` |
| `style.js` | `button(theme)` → the button's tokens (size, icon, colours by theme name, tooltips, `position`); `pane(theme)` → the pane's tokens and labels; `ICON` paths |
| `world.js` | `buildWorld({ event, cache })`: local spaces with their place and folder, the focused space, whether the worktree's folder exists, whether its repository is shown; `buildSweepWorld()`: local spaces, each `gone` when its folder and place are both missing |
| `pane.js` | `Pane`: the pane role — reads the shared model and status, loads wtm's on-demand outputs, runs the actions, draws the sections; `BLOCKED`, `message` |
| `main.js` | the `View`: launcher, service copy or pane (by props), startup, the drain loop, exit handling, `stop`, `sync`, `retry`, the button |

## Why each piece is there

Each comes from a Herdr app limit, observed in a running app:

- **A worker in herdr-core.** A mod's `exec` returns only when the program ends; `wtm events` never ends. A named `hc` terminal with no `herdr.*` label is invisible in the window, and `--outlive-parent` keeps it across app restarts.
- **One file per event.** `watchFolder` reports created and renamed entries, not appends, and skips hidden folders. The worker writes `.tmp` then renames it to `<n>.json` (`n` = seconds × 10⁶ + a counter: increasing across runs, below 2⁵³).
- **`exec` for the inbox's writes.** `fs/promises` writes only under `~/.config/herdr-app` and reads only inside home; `mv`, `rm` and `test -e` go through `exec`.
- **A kept window.** A mod runs only while shown, `place` other than `none` is never docked into Herdr's read-only shipped layouts, and the status bar and the Files/Changes buttons have no extension point. `openOverlay({ kind: "window", key, keep: true })` reopens on every start.
- **A measuring launcher.** Windows are placed by absolute `at` only, and a mod cannot read the window's size. The launcher is a dialog sized 0.5 × 0.5 of the window (`mod.json`'s `overlay`; a popup ignores its height, and `1` reads as one pixel); its first non-empty `on_size_change`, doubled, is the window. Herdr keeps windows off the bottom edge, so the button goes in the top bar.
- **The live model in `shared`.** Only the service copy reads the inbox (it claims and deletes each event), so it folds every event into a JSON model and publishes it with `setShared`, which re-renders every copy. A new copy starts from the published model (`shared` persists) plus the events waiting in the inbox; only when none was published does it restart the worker, whose new stream opens on a snapshot. Restarting every time would lose the events emitted between the kill and the new stream.
- **A mod pane, not a third panel.** The Files/Changes panel is a stack in Herdr's read-only `main` layout and the `tabs` mod draws only its two buttons, so the pane is a `pane.split { mod }` in the active tab. It splits the pane beside it in two: a mod cannot set a pane's width.
- **Re-selecting after `space.new`.** `space.new` selects the new space; the previously active one is selected right after, so the focus never moves.

## The worker

- **One per machine**, named `herdr-app-wtm`, labelled `herdr-app-wtm.script=<SCRIPT_VERSION>` and `herdr-app-wtm.run=<id>`. `ensureWorker` reuses a live one with the current script on the same wtm, else kills, removes and starts one, and returns the run id now working.
- **Compatibility first.** `wtm version --output json` must report `events >= MIN_EVENTS`; otherwise the button goes red and a notification says to upgrade.
- **Exit marker.** After wtm exits, the script writes `{"type":"herdr-app-wtm.exit","code":N,"run":"<id>"}` through the same inbox. A marker from another run is ignored. Codes `2` and `20` stop for good (`stream-stopped`); any other restarts with a backoff from 1 s to 30 s, reset on `ready`.
- **Liveness.** Every 30 s the service copy checks the worker is live and restarts it if not (a worker killed or lost with its core writes no marker), then drains.

## The inbox

- **Claim by rename.** `take` renames each `<n>.json` to `<n>.json.<copyId>.<claimMs>` before reading it; a failed `mv` means another copy took it. Two copies (two layouts, two clients) never handle one event.
- **Release.** `take` first renames back claims older than a minute: a copy that died mid-batch left them.
- **Order.** Numeric, so `…10.json` follows `…9.json`. A file is removed only after its event was acted on: a crash in between replays it, and every action is guarded so a replay does nothing.

## Decisions

- `worktree.created` opens a space when the worktree is linked, its folder exists, its repository is shown (a local space's place has the event's `common_dir` as git common dir) and no local space's place is inside it. The previously focused space is selected again.
- `worktree.removed` closes each local space whose place is inside the worktree **and whose folder is inside it**, when the worktree is linked and its folder is gone. A space made elsewhere whose terminal went into the worktree (the main checkout's, with its agents) stays.
- **Resync** (the pane's Resync spaces button, or the `sync` command): `sweep` closes each local space whose folder and place are both gone, then the worker is stopped and started again; wtm opens the new stream on a `snapshot` per repository, and until its `ready` line `replay` turns each into `worktree.created` events for `decide`. The stopped run's id is dropped first, so its exit marker schedules no restart.
- **A click toggles the pane.** A press still drags the button; a drag that ends in a click may toggle the pane, accepted over losing the drag. When sync is down, the pane shows why with a Retry button (the `retry` command).
- For spaces, everything else is ignored, `snapshot` included outside a resync (the model still takes every event). Spaces on other machines are never matched.

## Testing

Pure modules run under Node: `decide` and `anchor` as tables, the inbox against a temp folder (two concurrent drains included), the worker's real `sh` script against a fake wtm that prints lines and exits with a chosen code, `ensureWorker` against a fake `hc`. `main.js` and `world.js` need the Herdr host: `make check` loads them once, and the manual checks in [`RECIPE.md`](../../RECIPE.md) ("Done when") cover the rest.
