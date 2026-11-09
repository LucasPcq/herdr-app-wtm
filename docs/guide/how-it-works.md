# How it works

The mod never changes what wtm does. It follows wtm's event stream and opens or closes spaces as worktrees come and go.

## The worker

The button starts a hidden herdr-core terminal named `herdr-app-wtm` that runs `wtm events --output json` from `/`, which follows every repository wtm knows. Each event is written as a file in `~/.local/state/herdr-app-wtm/inbox/`; the mod reads it, acts, and deletes it.

The worker keeps running when the window closes or Herdr quits. Events that arrive meanwhile wait in the inbox and are applied when the button comes back, each checked against what is on disk then.

## Which repositories

Only repositories the window shows: a local space whose first terminal (or, without one, its folder) is inside the repository or one of its worktrees. A worktree created in a repository with no space is left alone.

## When a space opens

On `wtm create` (from the popup of herdr-wtm, a shell, an agent, `wtm ui`), a space opens on the new worktree when its folder exists and no space is already inside it. The space you were on stays selected: the new one appears in the sidebar without taking the focus.

## When a space closes

On `wtm clean` or `wtm prune`, a space closes when it was made on the removed worktree (its folder is inside it) and the folder is gone. Never closed:

- the main checkout's space, even if one of its terminals went into the worktree;
- a space whose folder is still on disk;
- a space on another machine.

## The button

`● wtm` in the top bar, next to Files and Changes. The dot says the state:

| Dot | Means |
| --- | --- |
| accent | syncing |
| grey | starting, or restarting after the stream stopped |
| red | sync is down; a notification said why: wtm not found, wtm too old, the stream stopped (an event newer than wtm), or an error |

Click a red button to retry once the cause is fixed. Otherwise a press drags it; Herdr remembers where you drop it.

## Limits

- The button belongs to the layout it was opened in. On another layout, events wait until you come back, or run `herdr-app do mod.open '{"name":"wtm"}'` there too.
- Local spaces only.
- A worktree moved with `wtm relocate`, or removed while the worker was down, is not followed.
- A folder reached through a symlink (`/tmp` vs `/private/tmp`) may not match its space.
