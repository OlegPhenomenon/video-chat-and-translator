# Plan state — FT-020

Зеркалит `## Порядок работ` из `.memory-bank/features/FT-020/implementation-plan.md`, но добавляет колонку `Done` для отслеживания прогресса в этом прогоне.

| STEP | Goal | Implements | Verifies | Done | Note |
|---|---|---|---|---|---|
| STEP-00 | PR-first: worktree + branch | — | — | ✅ | worktree `.worktrees/FT-020-ai-chat`, ветка `FT-020-ai-chat`, PR откроется на stage 8 |
| STEP-01 | frozen types + errors | CTR-01, CTR-02 | CHK-02 | ✅ | `chat/{types,errors}.ts`, `providers.ts` (ALL_PROVIDERS, labels, defaults) |
| STEP-02 | 3 provider adapters | CTR-02, REQ-03, FM-01..05 | CHK-02 | ✅ | `chat/providers/{openai,anthropic,groq}.ts` + `providers/index.ts` registry |
| STEP-03 | router `client.ts` | CTR-01, REQ-03, REQ-05 | CHK-02, CHK-04 | ✅ | dispatch + transcript-injection в system-message ПЕРЕД историей |
| STEP-04 | `context.ts` | CTR-03, REQ-05, FM-03, NEG-04 | CHK-04 | ✅ | extractTranscriptText + truncation MAX_CONTEXT_CHARS=80000 |
| STEP-05 | `storage.ts` (chat history) | CTR-04, REQ-07, NEG-03, FM-06 | CHK-05 | ✅ | additive миграция version 1→2 в `videos/storage.ts`, новый store `chat_messages` |
| STEP-06 | `ChatPanel.tsx` | REQ-01, REQ-02, REQ-04, REQ-06, REQ-08 | CHK-01, CHK-06 | ✅ | DOM hooks `data-chat-*`, scrollIntoView с jsdom guard, текст toggle «Скрыть чат» (избегаем коллизии с SubtitlesPanel) |
| STEP-07 | интеграция в `Show.tsx` | REQ-01, REQ-05 | CHK-01, CHK-03 | ✅ | `<ChatPanel videoId={id} subtitlesFile={state.record.subtitles ?? null} />` рядом с SubtitlesPanel; xl-flex-row |
| STEP-08 | local Docker verify | CHK-02, CHK-04, CHK-05 | CHK-02, CHK-04, CHK-05 | ✅ | Vitest 47/47, typecheck OK, логи в `artifacts/ft-020/verify/chk-02,04,05/` |
| STEP-09 | Playwright evidence | CHK-01, CHK-03, CHK-06 | CHK-01, CHK-03, CHK-06 | ⏳ | requires `docker compose up` + `playwright-cli` skill; manual gap approve `AG-01` |
| STEP-10 | simplify review | — | — | ⏳ | после `STEP-09` |

## Open Questions resolved by execution

- `OQ-01` ключ localStorage: завели отдельный namespace `ft-020:chat_api_key:<provider>` (как в плане default).
- `OQ-02` breakpoint: использовали `xl:flex-row` для трёх колонок (как в default плана).
- `OQ-03` data-test hooks: добавлены `data-chat-panel`, `data-chat-history`, `data-chat-input`, `data-chat-send`, `data-chat-message-role`, `data-chat-error`, `data-chat-provider`, `data-chat-provider-select`.
- `OQ-04` UC update: остаётся pending до closure (см. Stage 8).

## Open / pending

- `STEP-09`, `STEP-10`, `OQ-04` — на следующем заходе (resume from stage 5)
- AG-01 manual approval — будет зафиксирован при сборе Playwright evidence
