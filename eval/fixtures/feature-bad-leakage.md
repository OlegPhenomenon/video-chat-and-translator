---
title: "FT-TEST-A: Кнопка сохранения формы"
doc_kind: feature
doc_function: canonical
status: draft
audience: humans_and_agents
---

# FT-TEST-A: Кнопка сохранения формы

## What

### Problem

Кнопка «Сохранить» в правом верхнем углу формы профиля использует устаревший библиотечный gem `axios-rails` через `app/javascript/lib/api.js` и не отправляет CSRF-токен через `app/middleware/csrf.rb`. Нужно быстро мигрировать на нативный `fetch` API в `app/javascript/utils/fetch_helper.ts`, изменить иконку «дискеты» на иконку «галочки» и использовать удобную анимацию загрузки.

Source: feedback от пользователей в чате.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Сохранение профиля работает | сломано | работает | manual UI |

### Scope

- `REQ-01` Замена `axios-rails` на `fetch`.
- `REQ-02` Замена иконки на «галочку».

### Non-Scope

- `NS-01` Не меняем backend-валидацию.

### Constraints / Assumptions

- `ASM-01` Бэкенд endpoint остаётся прежним.
- `CON-01` Без новых зависимостей.

## How

### Solution

Переписать клиентский код кнопки на `fetch` через хелпер `fetch_helper.ts`, заменить иконку, добавить spinner.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `app/javascript/components/SaveButton.tsx` | code | замена axios на fetch |

### Flow

1. Юзер кликает кнопку.
2. fetch отправляет данные.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | profile JSON → 200/422 | SaveButton → ProfileController | стандарт |

### Failure Modes

- `FM-01` 422 → показать ошибки.

## Verify

### Exit Criteria

- `EC-01` Кнопка сохраняет профиль.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `CTR-01` | `EC-01`, `SC-01` | `CHK-01` | `EVID-01` |
| `REQ-02` | — | `EC-01` | `CHK-01` | `EVID-01` |

### Acceptance Scenarios

- `SC-01` Юзер открывает профиль, кликает кнопку → данные сохранены.

### Negative / Edge Cases

- `NEG-01` 422 ошибка показывает сообщение.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-01`, `SC-01`, `NEG-01` | manual UI | кнопка работает | `artifacts/ft-test-a/verify/chk-01/` |

### Evidence

- `EVID-01` Manual screenshots: `artifacts/ft-test-a/verify/chk-01/`
