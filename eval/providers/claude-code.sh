#!/usr/bin/env bash
# Аргумент $1 — отрендеренный промпт от promptfoo
# --dangerously-skip-permissions нужен, потому что Claude Code в этом промпте
# читает файлы из .memory-bank — без флага он будет спрашивать разрешение и виснуть

claude -p "$1" --dangerously-skip-permissions --output-format json | jq -r '.result' 