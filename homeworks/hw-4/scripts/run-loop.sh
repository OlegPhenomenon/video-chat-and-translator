#!/usr/bin/env bash
# run-loop.sh — universal runner for HW-4 small loops (brief / spec).
#
# Reuses the orchestration primitives from scripts/start-task.sh: opens a new
# zellij tab in the current (or selected) session and starts claude with a
# launch script that injects loop prompt + artefact path via env vars. The
# agent works in-place inside the loop's process-spec contract; runner only
# tracks iterations, captures logs and writes trace/report.
#
# Usage:
#   homeworks/hw-4/scripts/run-loop.sh \
#     --loop brief|spec \
#     --artifact <path-to-brief.md | feature.md | FT-dir> \
#     [--max-iters 3] \
#     [--session <zellij-session>] \
#     [--run-id <id>]            # default: <loop>-<artifact-slug>-<YYYYMMDD-HHMM>
#
# Run artefacts land under homeworks/hw-4/runs/<run-id>/:
#   - iter-N.log              full stdout of each iteration
#   - trace.md                chronological log
#   - report.md               final status (done|blocked|escalation)

set -euo pipefail

log() { printf '[run-loop] %s\n' "$*"; }
err() { printf '[run-loop] error: %s\n' "$*" >&2; }

usage() {
	cat <<'EOF' >&2
Usage: homeworks/hw-4/scripts/run-loop.sh \
         --loop brief|spec \
         --artifact <path> \
         [--max-iters 3] \
         [--session <name>] \
         [--run-id <id>]
EOF
	exit 1
}

loop_kind=""
artifact=""
max_iters=3
session_override=""
run_id=""

while [[ $# -gt 0 ]]; do
	case "$1" in
	--loop)
		loop_kind="$2"
		shift 2
		;;
	--artifact)
		artifact="$2"
		shift 2
		;;
	--max-iters)
		max_iters="$2"
		shift 2
		;;
	--session)
		session_override="$2"
		shift 2
		;;
	--run-id)
		run_id="$2"
		shift 2
		;;
	-h | --help) usage ;;
	*)
		err "unknown arg: $1"
		usage
		;;
	esac
done

[[ -z "$loop_kind" ]] && err "--loop is required" && usage
[[ -z "$artifact" ]] && err "--artifact is required" && usage

case "$loop_kind" in
brief | spec) ;;
*)
	err "--loop must be 'brief' or 'spec', got '$loop_kind'"
	exit 1
	;;
esac

if [[ ! -e "$artifact" ]]; then
	err "artifact not found: $artifact"
	exit 1
fi

if ! command -v claude >/dev/null 2>&1; then
	err "claude not found in PATH"
	exit 1
fi

if ! command -v zellij >/dev/null 2>&1; then
	err "zellij not found in PATH"
	exit 1
fi

repo_root="$(git rev-parse --show-toplevel)"
artifact_abs="$(cd "$(dirname "$artifact")" && pwd)/$(basename "$artifact")"

# --- determine FEATURE_PATH / PLAN_PATH for spec loop -----------------------
feature_path=""
plan_path=""
if [[ "$loop_kind" == "spec" ]]; then
	if [[ -d "$artifact_abs" ]]; then
		feature_path="$artifact_abs/feature.md"
		[[ -f "$artifact_abs/implementation-plan.md" ]] && plan_path="$artifact_abs/implementation-plan.md"
	else
		feature_path="$artifact_abs"
	fi
	if [[ ! -f "$feature_path" ]]; then
		err "feature.md not found at $feature_path"
		exit 1
	fi
fi

# --- run id and run dir ------------------------------------------------------
slug="$(basename "$artifact_abs" | tr '/. ' '-' | tr -cd 'A-Za-z0-9-_' | head -c 40)"
ts="$(date +%Y%m%d-%H%M)"
[[ -z "$run_id" ]] && run_id="${loop_kind}-${slug}-${ts}"
run_dir="$repo_root/homeworks/hw-4/runs/$run_id"
mkdir -p "$run_dir"

trace="$run_dir/trace.md"
report="$run_dir/report.md"

# --- resolve zellij session (mirrors start-task.sh logic) -------------------
zellij_session=""
if [[ -n "$session_override" ]]; then
	zellij_session="$session_override"
elif [[ -n "${ZELLIJ_SESSION_NAME:-}" ]]; then
	zellij_session="$ZELLIJ_SESSION_NAME"
elif [[ -z "${ZELLIJ:-}" ]]; then
	mapfile -t sessions < <(zellij list-sessions 2>/dev/null |
		sed -E 's/\x1b\[[0-9;]*m//g' |
		awk '{print $1}' |
		grep -v '^$' || true)
	if [[ ${#sessions[@]} -eq 0 ]]; then
		err "no zellij sessions running — start one or pass --session"
		exit 1
	elif [[ ${#sessions[@]} -gt 1 ]]; then
		err "multiple zellij sessions: ${sessions[*]} — pass --session"
		exit 1
	fi
	zellij_session="${sessions[0]}"
fi
zellij_cmd=(zellij)
[[ -n "$zellij_session" ]] && zellij_cmd+=(--session "$zellij_session")

# --- prompt files ------------------------------------------------------------
prompt_file="$repo_root/homeworks/hw-4/$loop_kind-loop/prompt.md"
spec_file="$repo_root/homeworks/hw-4/$loop_kind-loop/process-spec.md"
if [[ ! -f "$prompt_file" ]]; then
	err "prompt not found: $prompt_file"
	exit 1
fi

# --- init trace --------------------------------------------------------------
{
	echo "# Trace — run $run_id"
	echo
	echo "- loop: $loop_kind"
	echo "- artifact: $artifact_abs"
	[[ -n "$plan_path" ]] && echo "- plan: $plan_path"
	echo "- max iterations: $max_iters"
	echo "- started: $(date -Iseconds)"
	echo "- session: ${zellij_session:-<current>}"
	echo
	echo "## Iterations"
	echo
} >"$trace"

# --- iteration loop ----------------------------------------------------------
final_status="blocked"
iter=0
prev_hash=""

# function: hash of the artefact(s) being improved, to detect "no progress"
compute_hash() {
	if [[ "$loop_kind" == "spec" ]]; then
		local h
		h="$(shasum -a 256 "$feature_path" | awk '{print $1}')"
		if [[ -n "$plan_path" && -f "$plan_path" ]]; then
			h="$h-$(shasum -a 256 "$plan_path" | awk '{print $1}')"
		fi
		printf '%s' "$h"
	else
		shasum -a 256 "$artifact_abs" | awk '{print $1}'
	fi
}

prev_hash="$(compute_hash)"

while ((iter < max_iters)); do
	iter=$((iter + 1))
	iter_log="$run_dir/iter-$iter.log"
	launch_script="$run_dir/.launch-iter-$iter.sh"
	verdict_file="$run_dir/.verdict-iter-$iter.txt"

	log "iteration $iter / $max_iters"

	# Compose env-export header for the agent's launch script.
	{
		echo "#!/usr/bin/env bash"
		echo "set -euo pipefail"
		echo "cd '$repo_root'"
		if [[ "$loop_kind" == "brief" ]]; then
			echo "export ARTIFACT_PATH='$artifact_abs'"
		else
			echo "export FEATURE_PATH='$feature_path'"
			echo "export PLAN_PATH='${plan_path:-}'"
		fi
		echo "export ITER_NO='$iter'"
		echo "export RUN_ID='$run_id'"
		echo "export VERDICT_FILE='$verdict_file'"
		echo "export PROCESS_SPEC='$spec_file'"
		echo "export LOOP_PROMPT='$prompt_file'"
		echo
		echo "clear"
		echo "echo '[run-loop] iteration $iter / $max_iters | loop=$loop_kind'"
		echo "echo '[run-loop] prompt: $prompt_file'"
		echo "echo '[run-loop] artefact(s):'"
		if [[ "$loop_kind" == "brief" ]]; then
			echo "echo '  - ARTIFACT_PATH=$artifact_abs'"
		else
			echo "echo '  - FEATURE_PATH=$feature_path'"
			[[ -n "$plan_path" ]] && echo "echo '  - PLAN_PATH=$plan_path'"
		fi
		echo "echo '[run-loop] when done, write your VERDICT first line into \$VERDICT_FILE'"
		echo "echo '----- begin agent -----'"
		echo
		echo "exec claude \\"
		echo "  --append-system-prompt \"\$(cat '$prompt_file')\" \\"
		echo "  \"Прочитай LOOP_PROMPT (\$LOOP_PROMPT) и PROCESS_SPEC (\$PROCESS_SPEC). \\"
		echo "Текущая итерация: \$ITER_NO. \\"
		echo "Сделай ровно один проход цикла на артефактах: \\"
		if [[ "$loop_kind" == "brief" ]]; then
			echo "ARTIFACT_PATH=\$ARTIFACT_PATH. \\"
		else
			echo "FEATURE_PATH=\$FEATURE_PATH (PLAN_PATH=\$PLAN_PATH). \\"
		fi
		echo "Когда готов — запиши первую строку verdict (APPROVE / REVISE / REJECT + причина) в \$VERDICT_FILE и заверши работу.\""
	} >"$launch_script"
	chmod +x "$launch_script"

	# Open a new zellij tab to run the iteration. The tab name encodes
	# loop+iter so it's easy to spot in the session.
	tab_name="${loop_kind}-iter-$iter"
	log "opening tab '$tab_name' (output → $iter_log)"

	# Wrap the launch in `tee` so we capture stdout to iter-N.log.
	wrapper="$run_dir/.wrapper-iter-$iter.sh"
	cat >"$wrapper" <<WRAP
#!/usr/bin/env bash
exec bash '$launch_script' 2>&1 | tee '$iter_log'
WRAP
	chmod +x "$wrapper"

	"${zellij_cmd[@]}" action new-tab --cwd "$repo_root" --name "$tab_name" -- bash "$wrapper"

	# Block until VERDICT_FILE appears (agent finished and wrote verdict).
	# Bounded wait: 30 minutes per iteration is more than enough; if the
	# agent didn't finish — escalate.
	deadline=$(($(date +%s) + 1800))
	while [[ ! -s "$verdict_file" ]]; do
		if (($(date +%s) > deadline)); then
			err "iteration $iter timed out after 30min — escalation"
			final_status="escalation"
			break 2
		fi
		sleep 5
	done

	verdict_line="$(head -n 1 "$verdict_file" 2>/dev/null || echo '')"
	log "verdict: $verdict_line"

	# Append to trace
	{
		echo "### Iteration $iter — $(date -Iseconds)"
		echo
		echo "- tab: \`$tab_name\`"
		echo "- log: \`$(realpath --relative-to="$repo_root" "$iter_log" 2>/dev/null || echo "$iter_log")\`"
		echo "- verdict: \`$verdict_line\`"
		echo
	} >>"$trace"

	# Decide what happens next based on verdict.
	case "$verdict_line" in
	APPROVE*)
		final_status="done"
		break
		;;
	REJECT*)
		final_status="escalation"
		break
		;;
	REVISE*)
		new_hash="$(compute_hash)"
		if [[ "$new_hash" == "$prev_hash" ]]; then
			err "REVISE returned but no changes on disk — blocked"
			final_status="blocked"
			break
		fi
		prev_hash="$new_hash"
		# continue to next iteration
		;;
	*)
		err "unknown verdict format: $verdict_line"
		final_status="blocked"
		break
		;;
	esac
done

if [[ "$final_status" == "blocked" && $iter -ge $max_iters ]]; then
	# We exited normally because we hit max_iters without APPROVE/REJECT
	final_status="escalation"
fi

# --- write report ------------------------------------------------------------
{
	echo "# Report — run $run_id"
	echo
	echo "STATUS: $(echo "$final_status" | tr '[:lower:]' '[:upper:]')"
	echo
	echo "- loop: $loop_kind"
	echo "- artifact: $artifact_abs"
	[[ -n "$plan_path" ]] && echo "- plan: $plan_path"
	echo "- iterations used: $iter / $max_iters"
	echo "- finished: $(date -Iseconds)"
	echo
	echo "## Verdict trail"
	echo
	for ((i = 1; i <= iter; i++)); do
		v_file="$run_dir/.verdict-iter-$i.txt"
		v_line="$(head -n 1 "$v_file" 2>/dev/null || echo '<missing>')"
		echo "- iter $i: \`$v_line\`"
	done
	echo
	echo "## Final artefact diff (vs first iteration input)"
	echo
	echo "See \`runs/$run_id/iter-1.log\` for input state, \`iter-$iter.log\` for final."
} >"$report"

log "report → $(realpath --relative-to="$repo_root" "$report" 2>/dev/null || echo "$report")"
log "status: $final_status"

case "$final_status" in
done | DONE) exit 0 ;;
*) exit 1 ;;
esac
