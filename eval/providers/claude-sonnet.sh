#!/usr/bin/env bash
claude -p "$1" --model sonnet --dangerously-skip-permissions --output-format json | jq -r '.result'
