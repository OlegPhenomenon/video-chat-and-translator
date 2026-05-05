# active-context: FT-020

feature_id: FT-020
issue: https://github.com/OlegPhenomenon/video-chat-and-translator/issues/19
current_stage: 5
last_completed_stage: 4
last_action_at: 2026-05-05T11:50:00+03:00
status: paused
next_action: resume from-stage 5 (smoke / safe deploy + verify EC-XX + close PR)
run_id: FT-020-20260505-1058
branch: FT-020-ai-chat
worktree: .worktrees/FT-020-ai-chat
last_green_commit: 793e26b

## Stages done

- stage 1 (brief-loop): brief.md APPROVE на 2-й итерации
- stage 2 (spec-loop): feature.md + plan APPROVE, scope creep отсутствует
- stage 3 (implement): commit 793e26b — `features/videos/chat/` (router + 3 адаптера + storage + context + ChatPanel) + интеграция в `pages/videos/Show.tsx`
- stage 4 (check):
  - Vitest полный suite в Docker — 47/47 passed (включая chat/* 27 тестов)
  - typecheck `npm run check` — 0 ошибок
  - evidence: `artifacts/ft-020/verify/chk-02/{vitest,typecheck,full-vitest}.log`, `chk-04/vitest.log`, `chk-05/vitest.log`

## STOP/RESUME marker

**Эта запись фиксирует обязательный stop большого цикла HW-4** (граница stage 4 → stage 5).
Состояние сохранено атомарно. Следующий заход:

```bash
cd .worktrees/FT-020-ai-chat
homeworks/hw-4/scripts/run-feature.sh \
  --feature-id FT-020 \
  --issue https://github.com/OlegPhenomenon/video-chat-and-translator/issues/19 \
  --from-stage 5
```

Runner прочитает эту секцию и продолжит с stage 5 без пересказа.

## Stage 5 — pending

план STEP-09 (Playwright evidence для CHK-01/03/06). Pre-condition: app поднят через
`docker compose -f docker/docker-compose.yml up`. Manual gap (`AG-01`) уже approve'нут в плане.

## Stage 6-8 — pending

- 6 verify: пройти EC-01..EC-05 на стенде, evidence в `artifacts/ft-020/verify/chk-01,03,06/`
- 7 fix-loop: только если verify нашёл проблемы
- 8 close: PR через `gh pr create` со ссылками на feature.md / plan / evidence
