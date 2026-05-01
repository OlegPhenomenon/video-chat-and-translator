---
title: "FT-TEST-B: Тёмная тема"
doc_kind: feature
doc_function: canonical
status: draft
audience: humans_and_agents
---

# FT-TEST-B: Тёмная тема

## What

### Problem

Пользователи, которые пользуются приложением вечером, жалуются на яркий белый фон. Это снижает удобство долгих сессий просмотра видео.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Доступность тёмной темы на странице видео | темы нет | пользователь может включить тёмную тему | manual UI |

### Scope

- `REQ-01` На страницах приложения работает тёмная тема, переключается toggle-контролом в шапке.
- `REQ-02` Выбор темы сохраняется между сессиями (localStorage).
- `REQ-03` Системные предпочтения пользователя (`prefers-color-scheme`) учитываются при первом заходе.

### Non-Scope

- `NS-01` Не делаем кастомизацию цветов.

### Constraints / Assumptions

- `ASM-01` Tailwind CSS уже настроен в проекте.
- `CON-01` Без новых UI-библиотек.

## How

### Solution

Использовать Tailwind dark mode + класс на `<html>`, состояние в localStorage.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `tailwind.config.js` | config | включить `darkMode: 'class'` |
| `app/frontend/components/Header.tsx` | code | toggle контрол |

### Flow

1. Юзер кликает toggle.
2. Класс `dark` применяется к `<html>`.
3. Tailwind классы переключают цвета.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | currentTheme: 'light' \| 'dark' \| 'system' → DOM class | toggle → DOM | стандарт Tailwind |

### Failure Modes

- `FM-01` localStorage недоступен → fallback на системные предпочтения.

## Verify

### Exit Criteria

- `EC-01` Тёмная тема работает на всех страницах.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `CTR-01` | `EC-01`, `SC-01` | `CHK-01` | `EVID-01` |

### Acceptance Scenarios

- `SC-01` Кликнуть toggle → страница меняет цветовую схему.

### Negative / Edge Cases

- `NEG-01` localStorage заблокирован → используется системная тема.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-01`, `SC-01` | Playwright скриншоты | страница в обоих режимах | `artifacts/ft-test-b/verify/chk-01/` |

### Evidence

- `EVID-01` Playwright screenshots: `artifacts/ft-test-b/verify/chk-01/light.png`, `dark.png`
