# Troubleshooting

## The button is red

A notification said why when it turned red:

| Cause | Fix |
| --- | --- |
| wtm not found | `brew install LucasPcq/tap/wtm`, then click the button |
| wtm too old | `wtm upgrade` (0.29 or later), then click the button |
| the stream stopped (exit 20) | wtm received an event newer than itself: `wtm upgrade`, then click the button |
| an error | the notification names it; fix it, then click the button |

## A space did not open

- Is the repository shown? A local space must be in it or in one of its worktrees ([How it works](how-it-works.md#which-repositories)).
- Is a space already inside the worktree? Then it is not opened twice.
- Is the worker running? `hc get herdr-app-wtm` should say `live`; the button restarts it within 30 s when it is not.

## A space did not close

- Was it made on the worktree? A space made elsewhere whose terminal went into the worktree stays, by design.
- Is the folder gone? `wtm clean` keeps a space while its folder is on disk.

## The worker's output

`hc read herdr-app-wtm` prints what wtm wrote to its terminal (errors included). `ls ~/.local/state/herdr-app-wtm/inbox/` lists events not handled yet: files that stay there mean the button is not running (open it with `herdr-app do mod.open '{"name":"wtm"}'`).

## Starting over

```bash
herdr-app do wtm.stop
herdr-app do mod.open '{"name":"wtm"}'
```
