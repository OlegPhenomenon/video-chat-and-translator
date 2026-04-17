---
title: "FT-016: Subtitles for uploaded videos"
doc_kind: feature
doc_function: canonical
purpose: "Добавить возможность прикреплять субтитры к загруженному видео, скачивать их и включать/выключать при просмотре."
derived_from:
  - ../README.md
  - ../../PRD.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-016: Subtitles for uploaded videos

## What

### Problem

Сейчас у загруженного видео нет управляемых субтитров: пользователь не может (а) загрузить субтитры к своему видео как отдельный файл, (б) скачать эти субтитры обратно, (в) управлять показом субтитров во время просмотра.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Видео с субтитрами воспроизводится с возможностью toggle | Нет | Да | Ручная проверка на странице просмотра видео |
| `MET-02` | Субтитры доступны для скачивания | Нет | Да | Ручная проверка: кнопка download отдает файл |

### Scope

- `REQ-01` Пользователь может загрузить файл субтитров для **своего** загруженного видео, и субтитры сохраняются рядом с видео в client-side storage (IndexedDB), привязанные к конкретному `videoId`.
- `REQ-02` Если у видео есть загруженные субтитры, пользователь может скачать этот файл субтитров из client-side storage.
- `REQ-03` На странице просмотра видео пользователь может включить или выключить отображение субтитров (без перезагрузки страницы).

### Non-Scope

- `NS-01` Автогенерация/перевод/редактирование субтитров в браузере.
- `NS-02` Поддержка нескольких дорожек субтитров (языки/варианты) — в рамках этой фичи предполагается одна attachment-дорожка.
- `NS-03` Любые миграции БД (не создавать без отдельного запроса).
- `NS-04` Persist состояния “субтитры включены” между перезагрузками страницы (по умолчанию toggle сбрасывается в выкл при каждом открытии видео).

### Constraints / Assumptions

- `ASM-01` Видео и связанные файлы хранятся client-side (IndexedDB), не синкаются через Rails и не доступны на других устройствах.
- `CON-01` Формат субтитров должен быть совместим с HTML5 `<track>` (минимально ожидается `.vtt`); при загрузке неподдерживаемого формата UI должен показать ошибку/отказ.
- `CON-02` UI-отказ для не-`.vtt` должен следовать существующему UX-паттерну валидации файлов (как на странице загрузки видео: строка ошибки рядом с input).
- `DEC-01` Resolution: download и upload применимы только в контексте client-side видео на устройстве пользователя (нет серверного “владельца/зрителя”). “Скачать” = скачать локальный `.vtt` из IndexedDB.

## How

### Solution

Расширить client-side запись видео в IndexedDB, добавив опциональный файл субтитров (`.vtt`). На странице просмотра добавить UI: загрузка/скачивание файла и переключатель видимости. На фронтенде подключать `<track kind="subtitles">` к `<video>` при наличии файла и управлять `TextTrack.mode` через toggle.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `video_chat_and_translator/app/frontend/pages/videos/Show.tsx` | code | UI: toggle субтитров, загрузка/скачивание при наличии |
| `video_chat_and_translator/app/frontend/features/videos/storage.ts` | code | IndexedDB: хранение/чтение/обновление `subtitles` рядом с video blob |

### Flow

1. Пользователь открывает страницу видео.
2. Если у видео нет субтитров — UI предлагает загрузить `.vtt`.
3. После загрузки UI показывает кнопку “Скачать субтитры” и переключатель “Субтитры: Вкл/Выкл”.
4. При включении субтитров видео показывает дорожку субтитров; при выключении — скрывает. При открытии страницы по умолчанию субтитры выключены (см. `NS-04`).

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | Upload subtitles: `.vtt` file → stored subtitles | UI (Show) → `videos/storage.ts` (IndexedDB) | Валидация формата в UI, обновление записи по `videoId` |
| `CTR-02` | Download subtitles: `videoId` → `.vtt` file | UI (Show) → `videos/storage.ts` → browser download | Имя файла, content type, отсутствие серверной авторизации |

### Failure Modes

- `FM-01` Пользователь загружает неподдерживаемый формат (не `.vtt`) → отказ + понятное сообщение.
- `FM-03` Файл субтитров поврежден/не читается браузером → субтитры не отображаются, UI остаётся работоспособным.

## Verify

### Exit Criteria

- `EC-01` Для client-side видео можно загрузить `.vtt`, после чего субтитры доступны на странице просмотра и включаются/выключаются.
- `EC-02` При наличии субтитров доступна скачка файла и возвращается корректный файл.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `ASM-01`, `CON-01`, `CON-02`, `CTR-01`, `FM-01` | `EC-01`, `SC-01`, `NEG-01` | `CHK-01`, `CHK-03` | `EVID-01`, `EVID-03` |
| `REQ-02` | `DEC-01`, `CTR-02` | `EC-02`, `SC-02` | `CHK-02` | `EVID-02` |
| `REQ-03` | `CTR-01`, `FM-03` | `EC-01`, `SC-01`, `NEG-02` | `CHK-01`, `CHK-03` | `EVID-01`, `EVID-03` |

### Acceptance Scenarios

- `SC-01` Пользователь загружает `.vtt` субтитры к client-side видео и может включать/выключать их на странице просмотра; состояние toggle влияет на отображение дорожки.
- `SC-02` При наличии субтитров пользователь может скачать тот же файл субтитров (корректное имя/тип/содержимое).

### Negative / Edge Scenarios

- `NEG-01` Пользователь пытается загрузить субтитры в неподдерживаемом формате (не `.vtt`) → UI отказывает, запись видео в IndexedDB не меняется.
- `NEG-02` Пользователь загружает “битый” `.vtt` → видео продолжает воспроизводиться; субтитры могут не отображаться, но UI не ломается.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-01`, `SC-01` | Ручной проход: открыть страницу видео → загрузить `.vtt` → включить/выключить | Субтитры отображаются и скрываются без перезагрузки | `artifacts/ft-016/verify/chk-01/` |
| `CHK-02` | `EC-02`, `SC-02` | Ручной проход: скачать субтитры после загрузки | Скачивается корректный файл `.vtt` | `artifacts/ft-016/verify/chk-02/` |
| `CHK-03` | `NEG-01`, `NEG-02` | Ручной проход: загрузить файл не `.vtt` (ожидаем UI-ошибку у input); затем загрузить “битый” `.vtt` | 1) UI отказывает и ничего не сохраняет 2) UI не ломается, видео проигрывается | `artifacts/ft-016/verify/chk-03/` |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
| --- | --- | --- |
| `CHK-01` | `EVID-01` | `artifacts/ft-016/verify/chk-01/` |
| `CHK-02` | `EVID-02` | `artifacts/ft-016/verify/chk-02/` |
| `CHK-03` | `EVID-03` | `artifacts/ft-016/verify/chk-03/` |

### Evidence

- `EVID-01` Скриншот(ы) UI страницы видео с включенными и выключенными субтитрами после загрузки.
- `EVID-02` Скачанный файл субтитров (или его checksum + скриншот download).
- `EVID-03` Скриншот(ы) отказа при загрузке не-`.vtt` и поведения при “битом” `.vtt`.
- `EVID-REVIEW-01` Ревью `feature.md` (Changes Requested) и grounding замечания (репо-артефакт): `artifacts/ft-016/reviews/review-01-changes-requested.md`.
- `EVID-REVIEW-02` Ревью `feature.md` (Approved, Design Ready gate) (репо-артефакт): `artifacts/ft-016/reviews/review-02-approved.md`.

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
| --- | --- | --- | --- | --- |
| `EVID-01` | Screenshot set | human | `artifacts/ft-016/verify/chk-01/` | `CHK-01` |
| `EVID-02` | Downloaded file + screenshot | human | `artifacts/ft-016/verify/chk-02/` | `CHK-02` |
| `EVID-03` | Screenshot set | human | `artifacts/ft-016/verify/chk-03/` | `CHK-03` |
