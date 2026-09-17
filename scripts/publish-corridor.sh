#!/usr/bin/env bash
# Publish apps/corridor to its own public repository.
#
# The corridor app is developed here, in the (private) Weave monorepo, and
# mirrored to a public repo for the hackathon submission / deployment. The
# mirror is a `git subtree split` of apps/corridor — the directory's own commit
# history, nothing else from the monorepo — plus a lockfile commit on top so
# the standalone repo installs reproducibly.
#
#   scripts/publish-corridor.sh git@github.com:<you>/corridor.git [branch]
#
# Re-run after every corridor change; it force-pushes (the split is
# deterministic, so history stays stable across runs).
set -euo pipefail

REMOTE="${1:?usage: publish-corridor.sh <remote-url> [branch]}"
BRANCH="${2:-main}"
ROOT="$(git rev-parse --show-toplevel)"
SPLIT="corridor-public"

cd "$ROOT"
git subtree split --prefix=apps/corridor -b "$SPLIT" >/dev/null
TMP="$(mktemp -d)"
git worktree add -q "$TMP" "$SPLIT"
(
  cd "$TMP"
  pnpm install --lockfile-only --silent
  git add pnpm-lock.yaml
  git -c user.name="$(git config user.name)" -c user.email="$(git config user.email)" commit -q -m "chore: lockfile" || true
  git push -f "$REMOTE" "HEAD:$BRANCH"
)
git worktree remove --force "$TMP"
git branch -D "$SPLIT" >/dev/null
echo "published apps/corridor → $REMOTE ($BRANCH)"
