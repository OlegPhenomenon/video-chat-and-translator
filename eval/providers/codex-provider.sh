#!/usr/bin/env bash
# Codex provider for promptfoo
# Uses codex exec with --yolo and extracts just the response
OUTPUT_FILE=$(mktemp)
codex exec "$1" --yolo -o "$OUTPUT_FILE" > /dev/null 2>&1
cat "$OUTPUT_FILE"
rm -f "$OUTPUT_FILE"