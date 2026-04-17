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

(нет активных черновиков в этом индексе)

## Completed packages

- [`FT-018_COMPLETED/`](FT-018_COMPLETED/)
  Показывать прогресс транскрибации (Issue #22).
