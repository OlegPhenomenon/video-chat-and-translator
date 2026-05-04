#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[init] %s\n' "$*"
}

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

log "worktree: $repo_root"

if command -v mise >/dev/null 2>&1; then
  log "trusting mise config and installing tools"
  mise trust -y
  mise install
else
  log "mise not found, skipping tool install"
fi

if [[ -f .gitmodules ]]; then
  log "updating git submodules"
  git submodule update --init --recursive --jobs=4 --depth=1
else
  log "no .gitmodules found, skipping submodules"
fi

find_primary_worktree() {
  git worktree list --porcelain | awk '
    /^worktree / { path=$2 }
    /^branch refs\/heads\/(main|master)$/ { print path; exit }
  '
}

source_worktree="${SOURCE_WORKTREE:-${MAIN_WORKTREE:-}}"
if [[ -z "$source_worktree" ]]; then
  source_worktree="$(find_primary_worktree || true)"
fi

if [[ -n "$source_worktree" && "$source_worktree" != "$repo_root" && -d "$source_worktree" ]]; then
  log "copying local config from $source_worktree"
  shopt -s nullglob

  for src in "$source_worktree"/.env "$source_worktree"/.env.* "$source_worktree"/.envrc; do
    name="$(basename "$src")"

    case "$name" in
      .env.example|.env.sample|.env.template)
        continue
        ;;
    esac

    target="$repo_root/$name"
    if [[ -e "$target" ]]; then
      log "keeping existing $name"
      continue
    fi

    cp -p "$src" "$target"

    case "$name" in
      .env|.env.*)
        chmod 600 "$target" || true
        ;;
    esac

    log "copied $name"
  done

  shopt -u nullglob
else
  log "source worktree not found, skipping local config copy"
fi

if [[ -f .envrc ]] && command -v direnv >/dev/null 2>&1; then
  log "allowing direnv for this worktree"
  direnv allow
else
  log "direnv or .envrc not present, skipping direnv allow"
fi

log "ready"
