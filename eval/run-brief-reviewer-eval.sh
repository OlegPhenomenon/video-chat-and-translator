#!/usr/bin/env bash
# Run brief_reviewer eval with all 3 models
# Usage: ./run-brief-reviewer-eval.sh [single|full]

set -euo pipedir

cd "$(dirname "$0")"

MODE="${1:-single}"
CONFIG="promptfooconfig.brief-reviewer-single.yaml"
OUTPUT="brief-reviewer-results.json"

if [ "$MODE" = "full" ]; then
  CONFIG="promptfooconfig.brief-reviewer.yaml"
  OUTPUT="brief-reviewer-full-results.json"
fi

echo "Running brief_reviewer eval in $MODE mode..."
echo "Config: $CONFIG"
echo "Output: $OUTPUT"

promptfoo eval -c "$CONFIG" --output "$OUTPUT" 2>&1 | tee brief-reviewer-run.log

echo ""
echo "Results written to $OUTPUT"
echo "View with: promptfoo view"
