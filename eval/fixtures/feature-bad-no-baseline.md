---
title: "FT-TEST-C: Сохранение прогресса просмотра видео"
doc_kind: feature
doc_function: canonical
status: draft
audience: humans_and_agents
---

# FT-TEST-C: Сохранение прогресса просмотра видео

## What

### Problem

Пользователи, которые смотрят длинные образовательные видео, теряют позицию воспроизведения при закрытии вкладки. При повторном открытии видео начинается с нуля, и пользователю приходится вручную перематывать в нужное место.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Сохранение позиции просмотра между сессиями | — | работает | UI-проверка |
| `MET-02` | Время восстановления позиции при открытии видео | — | мгновенно | manual |

### Scope

- `REQ-01` При просмотре видео текущая позиция сохраняется локально (IndexedDB).
- `REQ-02` При повторном открытии того же видео плеер автоматически перематывает на сохранённую позицию.

### Non-Scope

- `NS-01` Не синхронизируем позицию между устройствами.

### Constraints / Assumptions

- `ASM-01` IndexedDB используется уже для `StoredVideoRecord`.
- `CON-01` Полностью client-side.

## How

### Solution

Добавить `lastPosition` в `StoredVideoRecord`. Подписаться на `timeupdate` и троттлить запись (каждые 5 секунд). При маунте плеера читать значение и устанавливать `currentTime`.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `app/frontend/features/videos/storage.ts` | code | добавить `lastPosition` в схему |
| `app/frontend/pages/videos/Show.tsx` | code | подписка на `timeupdate` и восстановление позиции |

### Flow

1. Юзер смотрит видео; позиция троттлится в IndexedDB.
2. Юзер закрывает вкладку.
3. Юзер открывает то же видео; плеер выставляет `currentTime` из IndexedDB.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | currentTime → IndexedDB write (троттлинг 5с) | Show.tsx → storage.ts | без блокировки UI |

### Failure Modes

- `FM-01` IndexedDB недоступна → fallback на отсутствие сохранения; ошибки в консоль не идут.

## Verify

### Exit Criteria

- `EC-01` Позиция воспроизведения сохраняется и восстанавливается.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `CTR-01`, `ASM-01` | `EC-01`, `SC-01` | `CHK-01` | `EVID-01` |
| `REQ-02` | `CTR-01` | `EC-01`, `SC-01` | `CHK-01` | `EVID-01` |

### Acceptance Scenarios

- `SC-01` Юзер смотрит видео 30 секунд, закрывает вкладку, открывает заново → плеер на той же позиции.

### Negative / Edge Cases

- `NEG-01` IndexedDB заблокирована → видео начинается с нуля, ошибок нет.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-01`, `SC-01`, `NEG-01` | Playwright | позиция восстанавливается | `artifacts/ft-test-c/verify/chk-01/` |

### Evidence

- `EVID-01` Playwright screenshots + assertion log: `artifacts/ft-test-c/verify/chk-01/`
