---
title: Feature Packages Index
doc_kind: feature
doc_function: index
purpose: Навигация по instantiated feature packages. Читать, чтобы найти существующую delivery-единицу или понять, где создавать новую.
derived_from:
  - ../dna/governance.md
  - ../flows/feature-flow.md
status: active
audience: humans_and_agents
---

# Feature Packages Index

Каталог `.memory-bank/features/` хранит instantiated feature packages вида `FT-XXX/`.

## Reading order

1. Начни с [`../index.md`](../index.md), если нужен общий контекст Memory Bank.
2. Затем открой этот индекс, чтобы найти нужный feature package по ID.
3. Внутри конкретного package сначала читай `README.md` как routing-слой.
4. После этого читай `feature.md` как canonical source of truth по scope, design и verify.
5. `implementation-plan.md` читай только если он уже существует и нужен execution context.

## Legacy vs Memory Bank flow

Ранние feature cycles в этом проекте использовали схему `brief.md -> spec.md -> plan.md`.

Текущий canonical flow в Memory Bank другой:

| Legacy flow | Memory Bank flow | Роль документа |
| --- | --- | --- |
| `brief.md` | `README.md` + верхняя часть `feature.md` | routing + problem framing |
| `spec.md` | `feature.md` | canonical scope / design / verify |
| `plan.md` | `implementation-plan.md` | derived execution plan |

Для `FT-*` пакетов canonical артефактами считаются `README.md`, `feature.md`, `implementation-plan.md` согласно [`../flows/feature-flow.md`](../flows/feature-flow.md). Backfill `brief.md/spec.md` допустим только как совместимость для legacy-навигации, но не является обязательным для нового flow.

## Feature ID map

| ID | Status | Topic | Notes |
| --- | --- | --- | --- |
| `001-auth-email_COMPLETED` | completed | Email/password auth | Legacy cycle: `brief/spec/plan` |
| `002-forgot-password_COMPLETED` | completed | Forgot password | Legacy cycle: `brief/spec/plan` |
| `003-user-profile_COMPLETED` | completed | User profile | Legacy cycle: `brief/spec/plan` |
| `004-dashboard-creation_COMPLETED` | completed | Dashboard | Legacy cycle: `brief/spec/plan` |
| `005-header-creation_COMPLETED` | completed | Header | Legacy cycle: `brief/spec/plan` |
| `006-video-uploader-page-COMPLETED` | completed | Video uploader page | Legacy cycle: `brief/spec/plan` |
| `007-configure-ci-cd_COMPLETED` | completed | CI/CD setup | Legacy cycle: `brief/spec/plan` |
| `008-placeholder-after-sign-up_COMPLETED` | completed | Post sign-up placeholder | Transitional package |
| `FT-016_COMPLETED` | completed | Subtitles for uploaded videos | First completed Memory Bank package |
| `FT-017_COMPLETED` | completed | Transcription via user API key | Depends on `FT-016` |
| `FT-018_COMPLETED` | completed | Transcription progress UI | Depends on `FT-017` |
| `FT-019_COMPLETED` | completed | Right-side subtitles panel | Issue #18 |

## Rules

- Каждый package создается по правилам из [`../flows/feature-flow.md`](../flows/feature-flow.md).
- Для bootstrap используй шаблоны из [`../flows/templates/feature/`](../flows/templates/feature/).
- Если feature реализует или существенно меняет устойчивый сценарий проекта, она должна ссылаться на соответствующий `UC-*` из [`../use-cases/README.md`](../use-cases/README.md).
- В шаблонном репозитории этот каталог может быть пустым. Это нормально.

## Hard Gate (feature-first)

Правила стадий, gates и запреты “код до Bootstrap” — canonical в [`../flows/feature-flow.md`](../flows/feature-flow.md). Этот индекс предназначен для навигации по instantiated packages, а не для дублирования flow-правил.

## Naming

- Базовый формат: `FT-XXX/`
- Вместо `XXX` используй идентификатор, принятый в проекте: issue id, ticket id или другой стабильный ключ
- Один package = одна delivery-единица
- После закрытия фичи (см. gate `Execution → Done` в [`../flows/feature-flow.md`](../flows/feature-flow.md)) директория package должна быть переименована, добавив в конец `_COMPLETED` (например `FT-016_COMPLETED/`). После переименования нужно обновить все ссылки/индексы на пакет.

## Active / Draft packages

No active/draft packages at this time.

## Completed packages

- [`FT-016_COMPLETED/`](FT-016_COMPLETED/)
  Субтитры для загруженных видео: upload/download/toggle `.vtt`.

- [`FT-017_COMPLETED/`](FT-017_COMPLETED/)
  Подключение API для транскрибации через пользовательский API key с сохранением `.vtt` локально.

- [`FT-018_COMPLETED/`](FT-018_COMPLETED/)
  Показывать прогресс транскрибации (Issue #22).

- [`FT-019_COMPLETED/`](FT-019_COMPLETED/)
  UI-панель субтитров справа от видео с возможностью скрывать/раскрывать и подсветкой активного сегмента (Issue #18).
