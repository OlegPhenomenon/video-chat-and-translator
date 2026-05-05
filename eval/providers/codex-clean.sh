#!/usr/bin/env bash
codex exec "$1" --yolo 2>&1 | tail -n +5