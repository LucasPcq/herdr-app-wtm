#!/usr/bin/env bash
# Pre-commit gates, run from a PreToolUse hook on Bash: `make test` (under a
# second) and, when the Herdr app is installed, `make check`, on every
# `git commit`.
#
# Exit 2 blocks the commit and hands the reason back to Claude.
# HERDR_APP_WTM_SKIP_GATES=1 gets past it, for when the gate itself is wrong.

set -uo pipefail

input=$(cat)
command=$(jq -r '.tool_input.command // ""' <<<"$input" 2>/dev/null)
hook_cwd=$(jq -r '.cwd // ""' <<<"$input" 2>/dev/null)

# Anchored so `git log --grep=commit` does not pay for a test run.
if ! grep -Eq '(^|[;&|]|&&|\|\|)[[:space:]]*git[[:space:]]+(-[^[:space:]]+[[:space:]]+)*commit([[:space:]]|$)' <<<"$command"; then
  exit 0
fi

if [[ "${HERDR_APP_WTM_SKIP_GATES:-}" == "1" ]]; then
  exit 0
fi

# The worktree being committed: `git -C <dir>` or `cd <dir> &&`, else the hook's cwd.
target=$(grep -Eo 'git[[:space:]]+-C[[:space:]]+[^[:space:];&|]+' <<<"$command" | head -1 | awk '{print $3}')
if [[ -z "$target" ]]; then
  target=$(grep -Eo '(^|[;&|])[[:space:]]*cd[[:space:]]+[^[:space:];&|]+' <<<"$command" | tail -1 | awk '{print $NF}')
fi
target=${target/#\~/$HOME}
target=${target//\"/}
target=${target//\'/}
[[ -n "$target" ]] || target=${hook_cwd:-$PWD}
[[ "$target" = /* ]] || target="${hook_cwd:-$PWD}/$target"

root=$(git -C "$target" rev-parse --show-toplevel 2>/dev/null) || exit 0
# Only this project's own repository (or one of its worktrees): a commit aimed
# at another repository must not run that repository's Makefile.
project_common=$(git -C "${CLAUDE_PROJECT_DIR:-$hook_cwd}" rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || exit 0
target_common=$(git -C "$root" rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || exit 0
[[ "$project_common" == "$target_common" ]] || exit 0
cd "$root" || exit 0
[[ -f Makefile && -d mods/wtm ]] || exit 0

fail() {
  echo "pre-commit gates: $1" >&2
  echo >&2
  echo "$2" >&2
  echo >&2
  echo "Fix it and commit again, or set HERDR_APP_WTM_SKIP_GATES=1 for this one command if the gate is itself wrong." >&2
  exit 2
}

if ! output=$(make test 2>&1); then
  fail "make test failed" "$(tail -40 <<<"$output")"
fi

if command -v herdr-app >/dev/null 2>&1; then
  if ! output=$(make check 2>&1); then
    fail "make check failed" "$output"
  fi
fi
