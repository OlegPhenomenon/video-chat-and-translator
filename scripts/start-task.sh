#!/usr/bin/env bash
# start-task.sh — orchestration entry point for HW-3.
#
# Creates an isolated git worktree under .worktrees/<branch>, runs init.sh
# inside it, opens a new zellij tab pointing to the worktree and starts the
# agent chosen by the routing rule (see docs/orchestration/routing.md).
#
# Works both when invoked from inside a zellij session ($ZELLIJ set) and
# from an external process — in the latter case pass --session <name> or rely
# on auto-detection if there is exactly one running session.
#
# Usage:
#   scripts/start-task.sh <branch-name> [--type <task-type>]
#                                       [--issue <number-or-url>]
#                                       [--base <branch>]
#                                       [--agent <name>]
#                                       [--session <zellij-session>]
#
# Defaults: --type freeform, --base main.
# --agent overrides whatever --type would pick.
# Pass --agent none to skip auto-starting an agent.

set -euo pipefail

usage() {
	cat <<'EOF' >&2
Usage: scripts/start-task.sh <branch-name> [flags]

  <branch-name>            new branch + worktree directory under .worktrees/

  --type <task-type>       routing rule (see docs/orchestration/routing.md):
                           spec | feature | frontend | bugfix | test | review
                           | docs | refactor | freeform   (default: freeform)
  --issue <num|url>        attach a GitHub issue reference to the agent prompt
  --base <branch>          base branch to fork from (default: main)
  --agent <name>           override agent: claude | codex | none
  --session <name>         target zellij session (auto-detected if omitted)

Either run from inside zellij or pass --session.
EOF
	exit 1
}

log() { printf '[start-task] %s\n' "$*"; }
err() { printf '[start-task] error: %s\n' "$*" >&2; }
hint() { printf '[start-task] hint: %s\n' "$*"; }

# routing_for <type> -> echoes "<agent>|<hint>"
# Keep in sync with docs/orchestration/routing.md.
routing_for() {
	case "$1" in
	spec)
		echo "claude|consider invoking the rails-architecture-analyst sub-agent and the spec-reviewer:spec-review skill"
		;;
	feature)
		echo "claude|consider invoking the rails-architecture-analyst sub-agent; for UI work also frontend-design"
		;;
	frontend)
		echo "claude|consider invoking the frontend-design skill and playwright-cli for visual checks"
		;;
	bugfix)
		echo "claude|consider invoking the rails-architecture-analyst sub-agent to map dependencies before editing"
		;;
	test)
		echo "claude|consider invoking the rails-qa-test-investigator sub-agent"
		;;
	review)
		echo "codex|consider running pr-review-fix-loop:codex-pr-review on this branch"
		;;
	docs)
		echo "claude|consider invoking the sc:document skill"
		;;
	refactor)
		echo "claude|consider invoking the rails-architecture-analyst sub-agent and avoid behaviour changes"
		;;
	freeform)
		echo "claude|"
		;;
	*)
		return 1
		;;
	esac
}

build_prompt() {
	local type="$1" branch="$2" issue="$3" hint_text="$4"
	local prompt="Branch: ${branch} (type: ${type})"
	if [[ -n "$issue" ]]; then
		prompt+=$'\n\n'"Issue: ${issue}"
		prompt+=$'\n\nПроанализируй issue, согласуй план до правки кода, затем сделай минимальный фикс с тестом. Не выходи за scope.'
	fi
	if [[ -n "$hint_text" ]]; then
		prompt+=$'\n\nRouting hint: '"${hint_text}"
	fi
	printf '%s' "$prompt"
}

[[ $# -lt 1 ]] && usage

branch=""
base="main"
agent_override=""
task_type="freeform"
issue=""
session_override=""

while [[ $# -gt 0 ]]; do
	case "$1" in
	--type)
		task_type="$2"
		shift 2
		;;
	--issue)
		issue="$2"
		shift 2
		;;
	--base)
		base="$2"
		shift 2
		;;
	--agent)
		agent_override="$2"
		shift 2
		;;
	--session)
		session_override="$2"
		shift 2
		;;
	-h | --help) usage ;;
	--*)
		err "unknown flag: $1"
		usage
		;;
	*)
		if [[ -z "$branch" ]]; then
			branch="$1"
			shift
		else
			err "unexpected argument: $1"
			usage
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

if [[ "$agent" == "codex" ]] && ! command -v codex >/dev/null 2>&1; then
	log "codex not available, falling back to claude (per routing fallback rule)"
	agent="claude"
fi

# --- resolve zellij session --------------------------------------------------
zellij_session=""
if [[ -n "$session_override" ]]; then
	zellij_session="$session_override"
elif [[ -n "${ZELLIJ_SESSION_NAME:-}" ]]; then
	zellij_session="$ZELLIJ_SESSION_NAME"
elif [[ -n "${ZELLIJ:-}" ]]; then
	# Inside zellij but ZELLIJ_SESSION_NAME isn't exported on every zellij build,
	# rely on `zellij list-sessions` returning current session as the only entry.
	zellij_session=""
else
	if ! command -v zellij >/dev/null 2>&1; then
		err "zellij is not installed"
		exit 1
	fi
	# Strip ANSI colour codes from list-sessions output, then extract first column.
	mapfile -t sessions < <(zellij list-sessions 2>/dev/null |
		sed -E 's/\x1b\[[0-9;]*m//g' |
		awk '{print $1}' |
		grep -v '^$' || true)
	if [[ ${#sessions[@]} -eq 0 ]]; then
		err "no zellij sessions running — start one with 'zellij' or pass --session"
		exit 1
	elif [[ ${#sessions[@]} -gt 1 ]]; then
		err "multiple zellij sessions found: ${sessions[*]} — pass --session <name>"
		exit 1
	fi
	zellij_session="${sessions[0]}"
fi

# build "zellij action" prefix: with --session if we have one
zellij_cmd=(zellij)
if [[ -n "$zellij_session" ]]; then
	zellij_cmd+=(--session "$zellij_session")
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

log "session=${zellij_session:-<current>}  type=$task_type  agent=$agent  base=$base  branch=$branch"

log "creating worktree $worktree_rel from $base"
git worktree add "$worktree_abs" -b "$branch" "$base"

log "running init in $worktree_rel"
(cd "$worktree_abs" && SOURCE_WORKTREE="$repo_root" bash scripts/init.sh)

# --- launch agent in new tab -------------------------------------------------
if [[ "$agent" == "none" ]]; then
	log "opening empty zellij tab '$branch'"
	"${zellij_cmd[@]}" action new-tab --cwd "$worktree_abs" --name "$branch"
else
	prompt="$(build_prompt "$task_type" "$branch" "$issue" "$routed_hint")"

	# Persist prompt + launch script inside the worktree itself. The new shell
	# in zellij starts asynchronously (possibly after start-task.sh exits), so
	# /tmp + trap-based cleanup races it. Putting both inside the worktree also
	# makes the prompt easy to inspect after the fact.
	prompt_file="$worktree_abs/.start-task-prompt.txt"
	launch_script="$worktree_abs/.start-task-launch.sh"

	printf '%s\n' "$prompt" >"$prompt_file"

	cat >"$launch_script" <<SCRIPT
#!/usr/bin/env bash
cd '${worktree_abs}'
clear
echo '[start-task launch] agent=${agent}  branch=${branch}  type=${task_type}'
echo '----- prompt -----'
cat '${prompt_file}'
echo '------------------'
echo
exec ${agent} "\$(cat '${prompt_file}')"
SCRIPT
	chmod +x "$launch_script"

	log "opening zellij tab '$branch' in session '${zellij_session:-<current>}' and starting $agent"
	"${zellij_cmd[@]}" action new-tab --cwd "$worktree_abs" --name "$branch" -- bash "$launch_script"
fi

if [[ -n "$routed_hint" ]]; then
	hint "$routed_hint"
fi

log "ready — switch to tab '$branch' in zellij to interact with the agent"
