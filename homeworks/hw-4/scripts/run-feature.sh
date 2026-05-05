#!/usr/bin/env bash
# run-feature.sh — big-loop orchestrator for HW-4.
#
# Walks a feature through 8 stages of SDLC with persistent state under
# homeworks/hw-4/state-pack/<feature-id>/. Reuses small loops via run-loop.sh
# (stages 1-2) and the worktree+zellij+routing primitives from
# scripts/start-task.sh (stage 3+). After every stage the agent writes
# .verdict-stage-<N>.txt; the orchestrator polls it and decides whether
# to advance, block or escalate.
#
# Usage:
#   homeworks/hw-4/scripts/run-feature.sh \
#     --feature-id <id> \
#     --issue <url-or-path> \
#     [--from-stage <N>] \
#     [--session <name>] \
#     [--max-fix-iters 3] \
#     [--auto-approve-spec]
#
# Stages:
#   1. brief-loop      (run-loop.sh --loop brief)
#   2. spec-loop       (run-loop.sh --loop spec)
#   3. implement       (start-task.sh --type feature)
#   4. check           (lint + typecheck + unit)
#   5. smoke           (scripts/test-ci.sh / docker e2e)
#   6. verify          (EC-XX/SC-XX walkthrough)
#   7. fix-loop        (mini iterations of 4-6 if verify failed)
#   8. close           (PR + final state)
#
# At every stage:
#   - state-pack/<id>/active-context.md is updated atomically;
#   - runs/<run-id>/trace.md gets an append;
#   - on completion (any status), runs/<run-id>/report.md is written and
#     state-pack/<id>/session-handoff.md is finalised.

set -euo pipefail

log() { printf '[run-feature] %s\n' "$*"; }
err() { printf '[run-feature] error: %s\n' "$*" >&2; }

usage() {
	cat <<'EOF' >&2
Usage: homeworks/hw-4/scripts/run-feature.sh \
         --feature-id <id> \
         --issue <url-or-path> \
         [--from-stage <N>] \
         [--session <name>] \
         [--max-fix-iters 3] \
         [--auto-approve-spec]

Stages: 1=brief, 2=spec, 3=implement, 4=check, 5=smoke, 6=verify, 7=fix, 8=close.
EOF
	exit 1
}

feature_id=""
issue=""
from_stage=""
session_override=""
max_fix_iters=3
auto_approve_spec=0

while [[ $# -gt 0 ]]; do
	case "$1" in
	--feature-id)
		feature_id="$2"
		shift 2
		;;
	--issue)
		issue="$2"
		shift 2
		;;
	--from-stage)
		from_stage="$2"
		shift 2
		;;
	--session)
		session_override="$2"
		shift 2
		;;
	--max-fix-iters)
		max_fix_iters="$2"
		shift 2
		;;
	--auto-approve-spec)
		auto_approve_spec=1
		shift
		;;
	-h | --help) usage ;;
	*)
		err "unknown arg: $1"
		usage
		;;
	esac
done

[[ -z "$feature_id" ]] && err "--feature-id is required" && usage
[[ -z "$issue" ]] && err "--issue is required" && usage

repo_root="$(git rev-parse --show-toplevel)"
hw4_root="$repo_root/homeworks/hw-4"

state_dir="$hw4_root/state-pack/$feature_id"
mkdir -p "$state_dir"

ts="$(date +%Y%m%d-%H%M)"
run_id="${feature_id}-${ts}"
run_dir="$hw4_root/runs/$run_id"
mkdir -p "$run_dir"
trace="$run_dir/trace.md"
report="$run_dir/report.md"

active_ctx="$state_dir/active-context.md"
plan_state="$state_dir/plan.md"
handoff="$state_dir/session-handoff.md"

run_loop="$hw4_root/scripts/run-loop.sh"
start_task="$repo_root/scripts/start-task.sh"

# --- determine starting stage ------------------------------------------------
last_completed=0
if [[ -f "$active_ctx" ]]; then
	last_completed="$(grep -E '^last_completed_stage:' "$active_ctx" 2>/dev/null | sed -E 's/.*: *([0-9]+).*/\1/' || echo 0)"
	[[ -z "$last_completed" ]] && last_completed=0
fi

if [[ -z "$from_stage" ]]; then
	from_stage=$((last_completed + 1))
fi

if [[ "$from_stage" -gt 8 ]]; then
	log "feature $feature_id is already done (last_completed=$last_completed)"
	exit 0
fi

if [[ "$last_completed" -gt 0 && "$from_stage" -ne $((last_completed + 1)) ]]; then
	log "WARNING: resuming from stage $from_stage but last_completed=$last_completed"
fi

# --- init trace --------------------------------------------------------------
{
	echo "# Big-loop trace — run $run_id"
	echo
	echo "- feature: \`$feature_id\`"
	echo "- issue: $issue"
	echo "- starting stage: $from_stage"
	echo "- previous last_completed: $last_completed"
	echo "- started: $(date -Iseconds)"
	echo
	echo "## Stages"
	echo
} >>"$trace"

# --- helpers -----------------------------------------------------------------

# Atomic write to active-context.md
write_active_ctx() {
	local stage_now="$1" stage_done="$2" next_action="$3" status="$4" extra="${5:-}"
	local tmp="$active_ctx.tmp.$$"
	{
		echo "# active-context: $feature_id"
		echo
		echo "feature_id: $feature_id"
		echo "issue: $issue"
		echo "current_stage: $stage_now"
		echo "last_completed_stage: $stage_done"
		echo "last_action_at: $(date -Iseconds)"
		echo "status: $status"
		echo "next_action: $next_action"
		echo "run_id: $run_id"
		[[ -n "$extra" ]] && echo "$extra"
	} >"$tmp"
	mv "$tmp" "$active_ctx"
}

write_handoff() {
	local status="$1" summary="$2"
	local tmp="$handoff.tmp.$$"
	{
		echo "# session-handoff: $feature_id"
		echo
		echo "status: $status"
		echo "last_run: $run_id"
		echo "updated: $(date -Iseconds)"
		echo
		echo "## What is done"
		echo
		for ((s = 1; s <= 8; s++)); do
			local v_file="$run_dir/.verdict-stage-$s.txt"
			if [[ -s "$v_file" ]]; then
				echo "- stage $s: \`$(head -n1 "$v_file")\`"
			fi
		done
		echo
		echo "## How to resume"
		echo
		echo "\`\`\`bash"
		echo "homeworks/hw-4/scripts/run-feature.sh \\"
		echo "  --feature-id $feature_id \\"
		echo "  --issue '$issue'"
		echo "\`\`\`"
		echo
		echo "Runner will read \`active-context.md\` and resume from \`last_completed_stage + 1\`."
		echo
		echo "## Summary"
		echo
		echo "$summary"
	} >"$tmp"
	mv "$tmp" "$handoff"
}

append_trace() {
	local stage="$1" verdict="$2" notes="$3"
	{
		echo "### Stage $stage — $(date -Iseconds)"
		echo
		echo "- verdict: \`$verdict\`"
		[[ -n "$notes" ]] && echo "- notes: $notes"
		echo
	} >>"$trace"
}

# Run a small loop (brief or spec) via run-loop.sh.
# Returns exit code from run-loop, sets verdict via that script's report.
run_small_loop() {
	local kind="$1" artifact="$2"
	local args=(--loop "$kind" --artifact "$artifact")
	[[ -n "$session_override" ]] && args+=(--session "$session_override")
	bash "$run_loop" "${args[@]}"
}

# Read the latest verdict from a small-loop run (we look at the most recent run dir).
latest_small_loop_verdict() {
	local kind="$1" slug="$2"
	# run-loop.sh names runs as <kind>-<slug>-<ts>; pick newest.
	local dir
	dir="$(ls -td "$hw4_root/runs/${kind}-${slug}-"* 2>/dev/null | head -n 1 || true)"
	[[ -z "$dir" ]] && return 1
	# Read STATUS line from report.md
	grep -E '^STATUS:' "$dir/report.md" 2>/dev/null | head -n 1 || echo "STATUS: UNKNOWN"
}

# Wait for an agent in zellij to write .verdict-stage-<N>.txt.
poll_verdict() {
	local stage="$1" timeout_sec="${2:-3600}"
	local v_file="$run_dir/.verdict-stage-$stage.txt"
	local deadline=$(($(date +%s) + timeout_sec))
	while [[ ! -s "$v_file" ]]; do
		if (($(date +%s) > deadline)); then
			err "stage $stage timed out after ${timeout_sec}s"
			return 1
		fi
		sleep 10
	done
	head -n 1 "$v_file"
}

# Open a stage-runner zellij tab that runs claude with prompt + STAGE env.
open_stage_tab() {
	local stage="$1" branch="$2"
	local tab_name="$feature_id-stage-$stage"
	local launch="$run_dir/.launch-stage-$stage.sh"
	local v_file="$run_dir/.verdict-stage-$stage.txt"
	local prompt_file="$hw4_root/big-loop/prompt.md"

	cat >"$launch" <<LAUNCH
#!/usr/bin/env bash
set -euo pipefail
cd '$repo_root'
export FEATURE_ID='$feature_id'
export ISSUE_URL='$issue'
export BRANCH_NAME='$branch'
export STAGE='$stage'
export STATE_DIR='$state_dir'
export RUN_DIR='$run_dir'
clear
echo '[run-feature] feature=$feature_id stage=$stage branch=$branch'
echo '[run-feature] When done, write your verdict (DONE|BLOCKED|ESCALATION: ...) to:'
echo '  $v_file'
echo '[run-feature] prompt: $prompt_file'
echo '----- begin agent -----'
exec claude \\
  --append-system-prompt "\$(cat '$prompt_file')" \\
  "Это запуск этапа \$STAGE из big-loop. Прочитай prompt.md, process-spec.md и active-context.md (если он не пуст), затем сделай работу СТРОГО для текущего STAGE. По завершении запиши verdict в \$RUN_DIR/.verdict-stage-\$STAGE.txt и заверши работу."
LAUNCH
	chmod +x "$launch"

	# Resolve zellij session
	local zcmd=(zellij)
	if [[ -n "$session_override" ]]; then
		zcmd+=(--session "$session_override")
	elif [[ -z "${ZELLIJ:-}" && -z "${ZELLIJ_SESSION_NAME:-}" ]]; then
		mapfile -t sessions < <(zellij list-sessions 2>/dev/null |
			sed -E 's/\x1b\[[0-9;]*m//g' |
			awk '{print $1}' |
			grep -v '^$' || true)
		if [[ ${#sessions[@]} -eq 1 ]]; then
			zcmd+=(--session "${sessions[0]}")
		fi
	fi

	"${zcmd[@]}" action new-tab --cwd "$repo_root" --name "$tab_name" -- bash "$launch"
}

# --- stage execution ---------------------------------------------------------
final_status="blocked"
branch_name="${feature_id,,}-impl"

for stage in 1 2 3 4 5 6 7 8; do
	if [[ "$stage" -lt "$from_stage" ]]; then
		continue
	fi

	log "===== STAGE $stage ====="
	write_active_ctx "$stage" $((stage - 1)) "running stage $stage" "running"

	verdict_line=""

	case "$stage" in
	1)
		# brief-loop. Artefact: .memory-bank/features/<FT>/brief.md (create if missing
		# from issue body — runner expects a path).
		brief_dir="$repo_root/.memory-bank/features/$feature_id"
		brief_file="$brief_dir/brief.md"
		mkdir -p "$brief_dir"
		if [[ ! -f "$brief_file" ]]; then
			# Seed from issue url (gh) or local path
			if [[ "$issue" =~ ^https?:// ]]; then
				if command -v gh >/dev/null 2>&1; then
					gh issue view "$issue" --json title,body --jq '"# Brief: " + .title + "\n\n" + .body' >"$brief_file" 2>/dev/null || echo "# Brief: $feature_id (placeholder)" >"$brief_file"
				else
					echo "# Brief: $feature_id (placeholder, no gh CLI)" >"$brief_file"
				fi
			elif [[ -f "$issue" ]]; then
				cp "$issue" "$brief_file"
			else
				echo "# Brief: $feature_id (placeholder)" >"$brief_file"
			fi
		fi

		log "running brief-loop on $brief_file"
		set +e
		run_small_loop brief "$brief_file"
		rl_status=$?
		set -e
		v_status="$(latest_small_loop_verdict brief "$(basename "$brief_file" | tr '/. ' '-' | tr -cd 'A-Za-z0-9-_' | head -c 40)")"
		case "$v_status" in
		*DONE*) verdict_line="DONE: brief APPROVE" ;;
		*ESCALATION*) verdict_line="ESCALATION: brief-loop escalated" ;;
		*) verdict_line="BLOCKED: brief-loop returned $v_status" ;;
		esac
		echo "$verdict_line" >"$run_dir/.verdict-stage-1.txt"
		;;
	2)
		spec_dir="$repo_root/.memory-bank/features/$feature_id"
		log "running spec-loop on $spec_dir"
		set +e
		run_small_loop spec "$spec_dir"
		set -e
		v_status="$(latest_small_loop_verdict spec "$(basename "$spec_dir" | tr '/. ' '-' | tr -cd 'A-Za-z0-9-_' | head -c 40)")"
		case "$v_status" in
		*DONE*) verdict_line="DONE: spec APPROVE" ;;
		*ESCALATION*) verdict_line="ESCALATION: spec-loop escalated" ;;
		*) verdict_line="BLOCKED: spec-loop returned $v_status" ;;
		esac
		echo "$verdict_line" >"$run_dir/.verdict-stage-2.txt"

		# HITL gate before stage 3
		if [[ "$verdict_line" == DONE:* && "$auto_approve_spec" -ne 1 && -t 0 ]]; then
			read -rp "[run-feature] spec APPROVE; proceed to implement? (y/N) " ans
			[[ "$ans" != "y" && "$ans" != "Y" ]] && verdict_line="BLOCKED: HITL declined to proceed to implement"
		fi
		;;
	3 | 4 | 5 | 6 | 7 | 8)
		# These stages run claude in a new zellij tab via the big-loop prompt;
		# the agent decides what to do based on STAGE env. Runner only polls
		# the verdict file.
		# Stage 3 also needs a worktree — open it via start-task.sh first.
		if [[ "$stage" -eq 3 ]]; then
			# Use existing branch if a worktree was already created, else create one
			if ! git worktree list --porcelain | grep -q "branch refs/heads/$branch_name"; then
				log "creating worktree for $branch_name via start-task.sh"
				args=("$branch_name" --type feature --issue "$issue")
				[[ -n "$session_override" ]] && args+=(--session "$session_override")
				# We open the worktree but pass --agent none — the big-loop tab
				# will be opened by us with the proper STAGE env.
				args+=(--agent none)
				bash "$start_task" "${args[@]}"
			fi
		fi

		log "opening big-loop tab for stage $stage"
		open_stage_tab "$stage" "$branch_name"
		log "polling verdict (timeout 60min)"
		set +e
		verdict_line="$(poll_verdict "$stage" 3600)"
		set -e
		[[ -z "$verdict_line" ]] && verdict_line="BLOCKED: verdict timeout at stage $stage"
		;;
	esac

	append_trace "$stage" "$verdict_line" ""
	log "stage $stage verdict: $verdict_line"

	case "$verdict_line" in
	DONE:*)
		write_active_ctx $((stage + 1)) "$stage" "advance to stage $((stage + 1))" "running"
		final_status="done"
		;;
	ESCALATION:*)
		write_active_ctx "$stage" $((stage - 1)) "human review required at stage $stage" "escalation" "blocker: ${verdict_line#ESCALATION: }"
		final_status="escalation"
		break
		;;
	*)
		# BLOCKED or unknown
		write_active_ctx "$stage" $((stage - 1)) "resume stage $stage after fix" "blocked" "blocker: ${verdict_line#BLOCKED: }"
		final_status="blocked"
		break
		;;
	esac
done

# --- finalise ----------------------------------------------------------------
{
	echo "# Report — run $run_id"
	echo
	echo "STATUS: $(echo "$final_status" | tr '[:lower:]' '[:upper:]')"
	echo
	echo "- feature: \`$feature_id\`"
	echo "- issue: $issue"
	echo "- run started at stage: $from_stage"
	echo "- finished: $(date -Iseconds)"
	echo
	echo "## Stage verdicts"
	echo
	for s in 1 2 3 4 5 6 7 8; do
		v_file="$run_dir/.verdict-stage-$s.txt"
		if [[ -s "$v_file" ]]; then
			echo "- stage $s: \`$(head -n1 "$v_file")\`"
		else
			echo "- stage $s: <not run in this resume>"
		fi
	done
	echo
	echo "## State pack"
	echo
	echo "- active-context: \`$(realpath --relative-to="$repo_root" "$active_ctx" 2>/dev/null || echo "$active_ctx")\`"
	echo "- plan: \`$(realpath --relative-to="$repo_root" "$plan_state" 2>/dev/null || echo "$plan_state")\`"
	echo "- session-handoff: \`$(realpath --relative-to="$repo_root" "$handoff" 2>/dev/null || echo "$handoff")\`"
	echo
	echo "## Trace"
	echo
	echo "Full trace: \`runs/$run_id/trace.md\`"
} >"$report"

write_handoff "$final_status" "Run $run_id finished with status $final_status. See \`$report\`."

log "report → runs/$run_id/report.md"
log "status: $final_status"

case "$final_status" in
done) exit 0 ;;
*) exit 1 ;;
esac
