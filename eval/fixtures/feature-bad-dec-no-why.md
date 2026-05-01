---
title: "FT-TEST-D: Кнопка скачивания транскрипта"
doc_kind: feature
doc_function: canonical
status: draft
audience: humans_and_agents
---

# FT-TEST-D: Кнопка скачивания транскрипта

## What

### Problem

Пользователи, которые получили транскрибацию видео через сервис, не могут сохранить текст транскрипта на свой компьютер. Это снижает ценность сервиса для образовательных сценариев, где пользователь хочет работать с транскриптом offline.

### Scope delta относительно Issue #42

Буквальный текст issue требует только: возможность скачать транскрипт. Ниже фиксируем расширения scope:

- `DEC-01` Множественные форматы (`REQ-02`) — расширение: поддерживаем VTT, SRT и plain text.
- `DEC-02` Сохранение имени файла на основе видео (`REQ-03`) — расширение: имя файла берётся из названия видео в IndexedDB.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Возможность скачать транскрипт | нет такой возможности | пользователь может скачать через UI | UI-проверка Playwright |

### Scope

- `REQ-01` На странице видео есть кнопка «Скачать транскрипт».
- `REQ-02` Поддерживаются форматы VTT, SRT, plain text.
- `REQ-03` Имя файла формируется из названия видео.

### Non-Scope

- `NS-01` Не делаем сжатие или конвертацию в PDF.

### Constraints / Assumptions

- `ASM-01` Транскрипт уже сохранён в IndexedDB как VTT (FT-018).
- `CON-01` Скачивание только через `<a download>`, без серверных endpoints.

## How

### Solution

Добавить кнопку с dropdown форматов. При клике конвертировать VTT в выбранный формат и инициировать скачивание через blob URL.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `app/frontend/features/videos/transcript-export.ts` (новый) | code | конверсия VTT → SRT/plain |
| `app/frontend/pages/videos/Show.tsx` | code | кнопка и dropdown |

### Flow

1. Юзер кликает «Скачать», выбирает формат.
2. Транскрипт конвертируется и скачивается с именем файла.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | VTT → string (SRT/plain/VTT) | transcript-export → Show.tsx | чистая функция |

### Failure Modes

- `FM-01` Транскрипт повреждён → кнопка disabled.

## Verify

### Exit Criteria

- `EC-01` Кнопка скачивает транскрипт в выбранном формате.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `CTR-01` | `EC-01`, `SC-01` | `CHK-01` | `EVID-01` |
| `REQ-02` | `CTR-01` | `EC-01`, `SC-01` | `CHK-01` | `EVID-01` |
| `REQ-03` | — | `EC-01`, `SC-02` | `CHK-01` | `EVID-01` |

### Acceptance Scenarios

- `SC-01` Кликнуть «Скачать» → выбрать SRT → файл скачивается.
- `SC-02` Имя скачанного файла содержит название видео.

### Negative / Edge Cases

- `NEG-01` Транскрипт пустой → кнопка disabled.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-01`, `SC-01`, `SC-02`, `NEG-01` | Playwright | кнопка скачивает файл | `artifacts/ft-test-d/verify/chk-01/` |

### Evidence

- `EVID-01` Playwright screenshots + downloaded files: `artifacts/ft-test-d/verify/chk-01/`
