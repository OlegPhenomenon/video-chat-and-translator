# session-handoff: FT-020

status: paused
last_run: FT-020-20260505-1058
updated: 2026-05-05T11:50:00+03:00
last_green_commit: 793e26b on branch `FT-020-ai-chat`

## What is done

- stage 1 brief-loop: `APPROVE: 0 замечаний, brief готов к spec-loop.`
- stage 2 spec-loop: `APPROVE: feature=0, plan=0, scope-инвариант PASS`
- stage 3 implement: `DONE: код в commit 793e26b`
- stage 4 check: `DONE: lint+typecheck+unit (47/47), evidence в artifacts/ft-020/verify/chk-02,04,05/`

## How to resume

Открыть worktree и продолжить с stage 5:

```bash
cd .worktrees/FT-020-ai-chat
homeworks/hw-4/scripts/run-feature.sh \
  --feature-id FT-020 \
  --issue https://github.com/OlegPhenomenon/video-chat-and-translator/issues/19 \
  --from-stage 5
```

Runner прочтёт `state-pack/FT-020/active-context.md` и пойдёт со stage 5 (smoke).

## What to read first on resume

1. `homeworks/hw-4/state-pack/FT-020/active-context.md` — текущее состояние, `last_completed_stage=4`, `next_action=resume from-stage 5`
2. `homeworks/hw-4/state-pack/FT-020/plan.md` — какие STEP-XX из implementation-plan уже сделаны (✅) и какие pending (⏳)
3. `.memory-bank/features/FT-020/feature.md` — canonical scope, особенно `## Verify` (EC-XX, CHK-XX, EVID-XX), которые проверяет stage 6
4. `.memory-bank/features/FT-020/implementation-plan.md` — секция `## Approval Gates` (`AG-01`) и `## Stop Conditions` для stage 5-7

## Where evidence lives

- unit/typecheck (`CHK-02`, `CHK-04`, `CHK-05`): `artifacts/ft-020/verify/chk-02,04,05/`
- UI/Playwright (`CHK-01`, `CHK-03`, `CHK-06`): `artifacts/ft-020/verify/chk-01,03,06/` — будет заполнено на stage 5-6
- review: `artifacts/ft-020/reviews/` — пусто, заполнится на stage 8

## Why this stop

Это **обязательный stop/resume** для HW-4 (минимум один в большом цикле). Граница выбрана между «локальный verify зелёный» (stage 4) и «UI evidence на стенде» (stage 5+) — чтобы между сессиями реально менялся контекст: первая сессия — pure-логика и unit-тесты, вторая — UI/E2E на поднятом приложении.

## Resume checklist

- [ ] открыть worktree `.worktrees/FT-020-ai-chat`
- [ ] прочесть этот файл + active-context.md
- [ ] поднять стек: `docker compose -f docker/docker-compose.yml up`
- [ ] запустить `run-feature.sh --from-stage 5` ИЛИ выполнить stage 5-8 inline (в зависимости от наличия zellij)
- [ ] на stage 5: scripts/test-ci.sh + smoke evidence
- [ ] на stage 6: пройти EC-01..EC-05, evidence в `artifacts/ft-020/verify/chk-01,03,06/`
- [ ] на stage 7: только если EC не закрыт, добавить fix STEP-XX в план и пройти 4-6 ещё раз
- [ ] на stage 8: rebase на main, `gh pr create`, обновить `EVID-PR-01`, финальный handoff `status: closed`
