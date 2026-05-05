#!/usr/bin/env bash
# Claude provider with rate-limit retry
# Adds delay between calls and retries on rate limit

OUTPUT_FILE=$(mktemp)
MAX_RETRIES=3
RETRY_DELAY=60

for i in $(seq 1 $MAX_RETRIES); do
  result=$(claude -p "$1" --model sonnet --dangerously-skip-permissions --output-format json 2>&1)
  api_error=$(echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('api_error_status', ''))" 2>/dev/null)
  
  if [ "$api_error" = "429" ]; then
    echo "Rate limited (attempt $i/$MAX_RETRIES), waiting ${RETRY_DELAY}s..." >&2
    sleep $RETRY_DELAY
    continue
  fi
  
  echo "$result" | jq -r '.result'
  rm -f "$OUTPUT_FILE"
  exit 0
done

echo "Rate limit persists after $MAX_RETRIES retries" >&2
rm -f "$OUTPUT_FILE"
exit 1