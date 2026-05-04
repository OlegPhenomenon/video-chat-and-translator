#!/usr/bin/env bash
# start-task.sh — orchestration entry point for HW-3.
#
# Creates an isolated git worktree under .worktrees/<branch>, runs init.sh
# inside it, opens a new zellij tab pointing to the worktree and auto-starts
# the agent chosen by the routing rule (see docs/orchestration/routing.md).
#
# Usage:
#   scripts/start-task.sh <branch-name> [--type <task-type>]
#                                       [--base <branch>]
#                                       [--agent <name>]
#
# Defaults: --type freeform, --base main.
# --agent overrides whatever --type would pick.
# Pass --agent none to skip auto-starting an agent.
#
# Requirements: must run inside an active zellij session.

set -euo pipefail

usage() {
  cat <<'EOF' >&2
Usage: scripts/start-task.sh <branch-name> [--type <task-type>] [--base <branch>] [--agent <name>]

  <branch-name>        new branch + worktree directory under .worktrees/
  --type <task-type>   routing rule (see docs/orchestration/routing.md):
                       spec | feature | frontend | bugfix | test | review
                       | docs | refactor | freeform   (default: freeform)
  --base <branch>      base branch to fork from (default: main)
  --agent <name>       override agent: claude | codex | none

Must be executed from inside a zellij session.
EOF
  exit 1
}

log()  { printf '[start-task] %s\n' "$*"; }
err()  { printf '[start-task] error: %s\n' "$*" >&2; }
hint() { printf '[start-task] hint: %s\n' "$*"; }

# routing_for <type> -> echoes "<agent>|<hint>"
# Keep in sync with docs/orchestration/routing.md.
routing_for() {
  case "$1" in
    spec)
      echo "claude|consider invoking the rails-architecture-analyst sub-agent and the spec-reviewer:spec-review skill" ;;
    feature)
      echo "claude|consider invoking the rails-architecture-analyst sub-agent; for UI work also frontend-design" ;;
    frontend)
      echo "claude|consider invoking the frontend-design skill and playwright-cli for visual checks" ;;
    bugfix)
      echo "claude|consider invoking the rails-architecture-analyst sub-agent to map dependencies before editing" ;;
    test)
      echo "claude|consider invoking the rails-qa-test-investigator sub-agent" ;;
    review)
      echo "codex|consider running pr-review-fix-loop:codex-pr-review on this branch" ;;
    docs)
      echo "claude|consider invoking the sc:document skill" ;;
    refactor)
      echo "claude|consider invoking the rails-architecture-analyst sub-agent and avoid behaviour changes" ;;
    freeform)
      echo "claude|" ;;
    *)
      return 1 ;;
  esac
}

[[ $# -lt 1 ]] && usage

branch=""
base="main"
agent_override=""
task_type="freeform"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type)  task_type="$2"; shift 2 ;;
    --base)  base="$2"; shift 2 ;;
    --agent) agent_override="$2"; shift 2 ;;
    -h|--help) usage ;;
    --*) err "unknown flag: $1"; usage ;;
    *)
      if [[ -z "$branch" ]]; then
        branch="$1"; shift
      else
        err "unexpected argument: $1"; usage
      fi
      ;;
  esac
done

[[ -z "$branch" ]] && usage

if ! routing_entry="$(routing_for "$task_type")"; then
  err "unknown --type '$task_type' — see docs/orchestration/routing.md"
  exit 1
fi

routed_agent="${routing_entry%%|*}"
routed_hint="${routing_entry#*|}"

if [[ -n "$agent_override" ]]; then
  agent="$agent_override"
else
  agent="$routed_agent"
fi

# Codex may be unavailable due to rate limits — fall back transparently.
if [[ "$agent" == "codex" ]] && ! command -v codex >/dev/null 2>&1; then
  log "codex not available, falling back to claude (per routing fallback rule)"
  agent="claude"
fi

if [[ -z "${ZELLIJ:-}" ]]; then
  err "must run inside a zellij session — start one with 'zellij' first"
  exit 1
fi

if [[ "$agent" != "none" ]] && ! command -v "$agent" >/dev/null 2>&1; then
  err "agent '$agent' not found in PATH"
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if ! git show-ref --verify --quiet "refs/heads/$base"; then
  err "base branch '$base' does not exist locally"
  exit 1
fi

if git show-ref --verify --quiet "refs/heads/$branch"; then
  err "branch '$branch' already exists — pick a different name or delete it first"
  exit 1
fi

worktree_rel=".worktrees/$branch"
worktree_abs="$repo_root/$worktree_rel"

if [[ -e "$worktree_abs" ]]; then
  err "path $worktree_rel already exists"
  exit 1
fi

mkdir -p "$repo_root/.worktrees"

log "type=$task_type  agent=$agent  base=$base  branch=$branch"

log "creating worktree $worktree_rel from $base"
git worktree add "$worktree_abs" -b "$branch" "$base"

log "running init in $worktree_rel"
( cd "$worktree_abs" && SOURCE_WORKTREE="$repo_root" bash scripts/init.sh )

log "opening zellij tab '$branch'"
zellij action new-tab --cwd "$worktree_abs" --name "$branch"

if [[ "$agent" != "none" ]]; then
  # Give zellij a moment to focus the new tab before sending keystrokes.
  sleep 0.3
  log "launching agent: $agent"
  zellij action write-chars "$agent"
  zellij action write-chars $'\n'
fi

if [[ -n "$routed_hint" ]]; then
  hint "$routed_hint"
fi

log "ready — switch to tab '$branch' to interact with the agent"
